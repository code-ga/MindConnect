/**
 * Broadcast service for sending WebSocket messages without circular dependencies
 * This allows services to publish to WebSocket clients without importing the app
 */

let serverInstance: any = null;

/**
 * Set the server instance (called from index.ts after app is initialized)
 */
export const setBroadcastServer = (server: any) => {
	serverInstance = server;
};

/**
 * Broadcast a message to a specific user's personal topic
 */
export const broadcastToUser = (profileId: string, message: any) => {
	if (!serverInstance) {
		console.warn("Broadcast server not initialized");
		return;
	}
	serverInstance.publish(`user:${profileId}`, JSON.stringify(message));
};

/**
 * Broadcast a message to a chatroom topic
 */
export const broadcastToRoom = (roomId: string, message: any) => {
	if (!serverInstance) {
		console.warn("Broadcast server not initialized");
		return;
	}
	serverInstance.publish(roomId, JSON.stringify(message));
};
