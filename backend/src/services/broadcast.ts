/**
 * Broadcast service for sending WebSocket messages without circular dependencies.
 * Uses a lazy getter so app.server is resolved at call time, not at init time.
 */

type BunServer = ReturnType<typeof Bun.serve>;

let getServer: (() => BunServer | null) | null = null;

/**
 * Register a getter that returns the current Bun server instance.
 * Call this from index.ts: setBroadcastServer(() => app.server)
 */
export const setBroadcastServer = (serverGetter: () => BunServer | null) => {
	getServer = serverGetter;
};

/**
 * Broadcast a message to a specific user's personal topic
 */
export const broadcastToUser = (profileId: string, message: any) => {
	const server = getServer?.();
	if (!server) {
		console.error(`[broadcast] Server not ready — dropping message to user:${profileId}`);
		return;
	}
	server.publish(`user:${profileId}`, JSON.stringify(message));
};

/**
 * Broadcast a message to a chatroom topic
 */
export const broadcastToRoom = (roomId: string, message: any) => {
	const server = getServer?.();
	if (!server) {
		console.error(`[broadcast] Server not ready — dropping message to room:${roomId}`);
		return;
	}
	server.publish(roomId, JSON.stringify(message));
};
