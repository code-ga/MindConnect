import { db } from "../database";
import { schema } from "../database/schema";
import { broadcastToUser } from "./broadcast";

type Role = "listener" | "psychologist" | "therapist";

interface MatchingUser {
	profileId: string;
	roles: Role[];
	startedAt: number;
}

class MatchingService {
	private queue: MatchingUser[] = [];
	private processingInterval: NodeJS.Timeout | null = null;
	private readonly MATCH_INTERVAL = 1000; // Check every 1 second

	constructor() {
		// Start the periodic matching process
		this.processingInterval = setInterval(() => {
			void this.processQueue();
		}, this.MATCH_INTERVAL);
	}

	async startMatching(profileId: string, roles: Role[]) {
		if (this.queue.find((u) => u.profileId === profileId)) {
			return { success: false, message: "Already in matching queue" };
		}

		const user = { profileId, roles, startedAt: Date.now() };
		this.queue.push(user);

		return { success: true, message: "Started matching" };
	}

	stopMatching(profileId: string) {
		this.queue = this.queue.filter((u) => u.profileId !== profileId);
		return { success: true, message: "Stopped matching" };
	}

	destroy() {
		if (this.processingInterval) {
			clearInterval(this.processingInterval);
			this.processingInterval = null;
		}
	}

	private async processQueue(): Promise<void> {
		if (this.queue.length < 2) return;

		for (let i = 0; i < this.queue.length; i++) {
			for (let j = i + 1; j < this.queue.length; j++) {
				const u1 = this.queue[i];
				const u2 = this.queue[j];

				if (!u1 || !u2) continue;

				if (this.canMatch(u1, u2)) {
					// Remove from queue
					this.queue.splice(j, 1);
					this.queue.splice(i, 1);

					await this.createMatch(u1.profileId, u2.profileId);
					// return this.processQueue();
				}
			}
		}
	}

	private canMatch(_u1: MatchingUser, _u2: MatchingUser): boolean {
		return true; // Match anyone for now
	}

	private async createMatch(p1Id: string, p2Id: string) {
		const [room] = await db
			.insert(schema.chattingRoom)
			.values({
				name: "Private Support Session",
				participantIds: [p1Id, p2Id],
				type: "private-chat-for-support",
				ownerId: p1Id,
				status: "active",
			})
			.returning();

		if (room) {
			console.log(`Matched ${p1Id} and ${p2Id} in room ${room.id}`);

			// Notify users via WebSocket broadcast
			const matchNotification = {
				type: "match_success",
				payload: { chatRoomId: room.id },
			};

			broadcastToUser(p1Id, matchNotification);
			broadcastToUser(p2Id, matchNotification);
		}
	}
}

export const matchingService = new MatchingService();
