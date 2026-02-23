import { Elysia, t, type Static } from "elysia";
import { authenticationMiddleware } from "../middleware/auth";
import { db } from "../database";
import { schema } from "../database/schema";
import { eq, sql } from "drizzle-orm";
import { dbSchemaTypes } from "../database/type";

type Profile = Static<typeof dbSchemaTypes.profile>;

// Map profileId to Socket IDs/Instances
export const userSockets = new Map<string, string>();

export const socketService = new Elysia()
	.use(authenticationMiddleware)
	.ws("/ws", {
		async open(ws) {
			const profile = (ws.data as any).profile as Profile;
			if (!profile) {
				ws.send({ type: "error", message: "Unauthorized" });
				ws.close();
				return;
			}

			// Map profile ID to the WebSocket ID
			userSockets.set(profile.id, ws.id);

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

			console.log(`User ${profile.username} (${profile.id}) connected via WS`);
		},
		async message(ws, message) {
			const profile = (ws.data as any).profile as Profile;
			if (!profile) return;

			if (message.type === "heartbeat") {
				await db
					.update(schema.profile)
					.set({ lastSeen: new Date() })
					.where(eq(schema.profile.id, profile.id));

				ws.send({ type: "heartbeat_ack", timestamp: Date.now() });
			}

			if (message.type === "chat_message") {
				const { chatRoomId, content } = message.payload as {
					chatRoomId: string;
					content: string;
				};

				// 1. Save message to DB
				const [newMessage] = await db
					.insert(schema.chatRoomMessage)
					.values({
						chatRoomId,
						senderId: profile.id,
						content,
					})
					.returning();

				if (newMessage) {
					// 2. Broadcast to the room topic
					ws.publish(chatRoomId, {
						type: "new_message",
						payload: newMessage,
					});

					// Also send to self (optional, if frontend doesn't optimistcally add)
					ws.send({
						type: "new_message",
						payload: newMessage,
					});
				}
			}
		},
		close(ws) {
			const profile = (ws.data as any).profile as Profile;
			if (profile) {
				userSockets.delete(profile.id);
				console.log(`User ${profile.username} disconnected from WS`);
			}
		},
		schema: {
			body: t.Object({
				type: t.String(),
				payload: t.Optional(t.Any()),
			}),
		},
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
