import { db } from "../database";
import { schema } from "../database/schema";
import { broadcastToUser } from "./broadcast";
import { eq } from "drizzle-orm";

const HEARTBEAT_TIMEOUT = 90_000; // 90 seconds = 3 missed heartbeats (30s each)

interface WaiterEntry {
	profileId: string;
	roles: string[];
	status: "working" | "busy";
	lastHeartbeat: number;
}

interface UserQueueEntry {
	profileId: string;
	requestedRole: string;
	startedAt: number;
}

class MatchingService {
	private waiters = new Map<string, WaiterEntry>();
	private userQueue: UserQueueEntry[] = [];
	private processingInterval: NodeJS.Timeout | null = null;
	private isProcessing = false;
	private matchableRoles: Set<string> = new Set();
	private readonly MATCH_INTERVAL = 1000; // Check every 1 second

	constructor() {
		// Load matchable roles from DB, then start interval
		void this.refreshMatchableRoles().then(() => {
			this.processingInterval = setInterval(() => {
				void this.processQueue();
			}, this.MATCH_INTERVAL);
		});
	}

	// ============ Role Management ============

	async refreshMatchableRoles(): Promise<void> {
		try {
			const roles = await db
				.select({ name: schema.role.name })
				.from(schema.role)
				.where(eq(schema.role.isMatchable, true));
			this.matchableRoles = new Set(roles.map((r) => r.name));
		} catch {
			// Table may not exist yet (before migration) — keep current set
		}
	}

	getMatchableRoles(): Set<string> {
		return this.matchableRoles;
	}

	isMatchableRole(role: string): boolean {
		return this.matchableRoles.has(role);
	}

	// ============ Waiter API ============

	async setWaiterWorking(
		profileId: string,
		requestedRoles: string[],
		permission: string[],
	): Promise<{ success: boolean; message: string }> {
		// Validate that requested roles are matchable and in user's permission
		const validRoles = requestedRoles.filter(
			(role) => permission.includes(role) && this.matchableRoles.has(role),
		);

		if (validRoles.length === 0) {
			return {
				success: false,
				message: "You don't have permission for any of the requested roles",
			};
		}

		// Check atomicity: if already working or busy
		if (this.waiters.has(profileId)) {
			return { success: false, message: "Already in working mode" };
		}

		// Set in-memory
		this.waiters.set(profileId, {
			profileId,
			roles: validRoles,
			status: "working",
			lastHeartbeat: Date.now(),
		});

		// DB write-through
		await db
			.update(schema.profile)
			.set({
				isMatching: true,
				matchingRoles: validRoles,
			})
			.where(eq(schema.profile.id, profileId));

		return { success: true, message: "Set to working mode" };
	}

	async setWaiterIdle(profileId: string): Promise<void> {
		// Remove from in-memory
		this.waiters.delete(profileId);

		// DB write-through
		await db
			.update(schema.profile)
			.set({ isMatching: false })
			.where(eq(schema.profile.id, profileId));
	}

	private setWaiterBusy(profileId: string): void {
		const waiter = this.waiters.get(profileId);
		if (waiter) {
			waiter.status = "busy";
		}
	}

	updateWaiterHeartbeat(profileId: string): void {
		const waiter = this.waiters.get(profileId);
		if (waiter) {
			waiter.lastHeartbeat = Date.now();
		}
	}

	getWaiterStatus(profileId: string): "idle" | "working" | "busy" {
		const waiter = this.waiters.get(profileId);
		if (!waiter) return "idle";
		return waiter.status;
	}

	getWaiterRoles(profileId: string): string[] {
		const waiter = this.waiters.get(profileId);
		return waiter?.roles ?? [];
	}

	// ============ User API ============

	async enqueueUser(
		profileId: string,
		requestedRole: string,
	): Promise<{ success: boolean; message: string }> {
		// Check atomicity: if already in queue
		if (this.userQueue.some((u) => u.profileId === profileId)) {
			return { success: false, message: "Already in matching queue" };
		}

		// Add to queue
		this.userQueue.push({
			profileId,
			requestedRole,
			startedAt: Date.now(),
		});

		// DB write-through
		await db
			.update(schema.profile)
			.set({
				isMatching: true,
				matchingRoles: [requestedRole],
			})
			.where(eq(schema.profile.id, profileId));

		return { success: true, message: "Started matching" };
	}

	async dequeueUser(profileId: string): Promise<void> {
		// Remove from queue
		this.userQueue = this.userQueue.filter((u) => u.profileId !== profileId);

		// DB write-through
		await db
			.update(schema.profile)
			.set({ isMatching: false })
			.where(eq(schema.profile.id, profileId));
	}

	stopMatching(profileId: string): { success: boolean; message: string } {
		const existed = this.userQueue.some((u) => u.profileId === profileId);
		if (existed) {
			void this.dequeueUser(profileId);
			return { success: true, message: "Stopped matching" };
		}
		return { success: false, message: "Not in matching queue" };
	}

	// ============ Reconnect Restoration ============

	async restoreState(profile: {
		id: string;
		isMatching: boolean;
		matchingRoles: string[];
		permission: string[];
	}): Promise<void> {
		if (!profile.isMatching) return;

		const now = Date.now();

		// If profile has any matchable role in permission, restore as waiter
		const hasWaiterRole = profile.permission.some((p) =>
			this.matchableRoles.has(p),
		);

		if (hasWaiterRole) {
			if (!this.waiters.has(profile.id)) {
				const roles = profile.matchingRoles.filter((r) =>
					this.matchableRoles.has(r),
				);
				if (roles.length > 0) {
					this.waiters.set(profile.id, {
						profileId: profile.id,
						roles,
						status: "working",
						lastHeartbeat: now,
					});
				}
			}
		} else {
			if (!this.userQueue.some((u) => u.profileId === profile.id)) {
				const requestedRole = profile.matchingRoles[0];
				if (requestedRole) {
					this.userQueue.push({
						profileId: profile.id,
						requestedRole,
						startedAt: now,
					});
				}
			}
		}
	}

	// ============ Status Check ============

	getUserQueueStatus(profileId: string): {
		inQueue: boolean;
		requestedRole: string | null;
	} {
		const user = this.userQueue.find((u) => u.profileId === profileId);
		return {
			inQueue: !!user,
			requestedRole: user?.requestedRole ?? null,
		};
	}

	// ============ Matching Logic ============

	private findAvailableWaiter(requestedRole: string): WaiterEntry | null {
		for (const waiter of this.waiters.values()) {
			if (
				waiter.status === "working" &&
				waiter.roles.includes(requestedRole)
			) {
				return waiter;
			}
		}
		return null;
	}

	private async processQueue(): Promise<void> {
		if (this.isProcessing) return;
		this.isProcessing = true;

		try {
			this.cleanupStaleWaiters();

			for (const user of [...this.userQueue]) {
				const waiter = this.findAvailableWaiter(user.requestedRole);
				if (!waiter) continue;

				this.setWaiterBusy(waiter.profileId);
				this.userQueue = this.userQueue.filter(
					(u) => u.profileId !== user.profileId,
				);
				await this.createMatch(user.profileId, waiter.profileId);
			}
		} finally {
			this.isProcessing = false;
		}
	}

	private cleanupStaleWaiters(): void {
		const now = Date.now();
		const staleWaiters: string[] = [];

		for (const [profileId, waiter] of this.waiters.entries()) {
			if (now - waiter.lastHeartbeat > HEARTBEAT_TIMEOUT) {
				staleWaiters.push(profileId);
			}
		}

		for (const profileId of staleWaiters) {
			this.waiters.delete(profileId);
			void db
				.update(schema.profile)
				.set({ isMatching: false })
				.where(eq(schema.profile.id, profileId));
		}
	}

	private async createMatch(userId: string, waiterId: string): Promise<void> {
		try {
			const [room] = await db
				.insert(schema.chattingRoom)
				.values({
					name: "Private Support Session",
					participantIds: [userId, waiterId],
					type: "private-chat-for-support",
					ownerId: userId,
					status: "active",
				})
				.returning();

			if (room) {
				console.log(`Matched ${userId} and ${waiterId} in room ${room.id}`);

				const matchNotification = {
					type: "match_success",
					payload: { chatRoomId: room.id },
				};

				broadcastToUser(userId, matchNotification);
				broadcastToUser(waiterId, matchNotification);

				await db
					.update(schema.profile)
					.set({ isMatching: false })
					.where(eq(schema.profile.id, waiterId));
			}
		} catch (error) {
			console.error("Error creating match:", error);
		}
	}

	destroy(): void {
		if (this.processingInterval) {
			clearInterval(this.processingInterval);
			this.processingInterval = null;
		}
	}
}

export const matchingService = new MatchingService();
