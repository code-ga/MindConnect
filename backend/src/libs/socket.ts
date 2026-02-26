import { eq, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../database";
import { schema } from "../database/schema";
// import { type SchemaStatic } from "../database/type";
import { authenticationMiddleware } from "../middleware/auth";
import { matchingService } from "../services/matching";

export const socketService = new Elysia()
	.use(authenticationMiddleware)
	.ws("/ws", {
		async open(ws) {
			const profile = ws.data.profile;
			if (!profile) {
				ws.send({ type: "error", message: "Unauthorized" });
				ws.close();
				return;
			}

			// Subscribe to personal topic and all chatroom topics user is in
			const chatrooms = await db
				.select()
				.from(schema.chattingRoom)
				.where(
					sql`${schema.chattingRoom.participantIds} @> ARRAY[${profile.id}]::text[]`,
				);

			for (const room of chatrooms) {
				ws.subscribe(room.id);
			}

			// Also subscribe to personal notification topic
			ws.subscribe(`user:${profile.id}`);

			// Update last seen
			await db
				.update(schema.profile)
				.set({ lastSeen: new Date() })
				.where(eq(schema.profile.id, profile.id));

			// Restore matching state if marked as matching in DB (for reconnect and crash recovery)
			await matchingService.restoreState(profile);

			console.log(`User ${profile.username} (${profile.id}) connected via WS`);
		},
		async message(ws, message: any) {
			const profile = ws.data.profile;
			if (!profile) return;

			if (message.type === "heartbeat") {
				await db
					.update(schema.profile)
					.set({ lastSeen: new Date() })
					.where(eq(schema.profile.id, profile.id));

				// Update waiter heartbeat if they are in working pool
				matchingService.updateWaiterHeartbeat(profile.id);

				ws.send({ type: "heartbeat_ack", timestamp: Date.now() });
			}
		},
		close(ws) {
			const profile = ws.data.profile;
			if (profile) {
				console.log(`User ${profile.username} disconnected from WS`);
			}
		},
		schema: {
			body: t.Object({
				type: t.String(),
				payload: t.Optional(t.Any()),
			}),
		},
		userAuth: true,
	});

// Helper to send notification to a specific user
export const broadcastNotification = (
	ws: any,
	profileId: string,
	notification: any,
) => {
	ws.publish(`user:${profileId}`, {
		type: "notification",
		payload: notification,
	});
};
