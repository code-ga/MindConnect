import { useEffect, useRef, useState, useCallback } from "react";
import { BACKEND_URL } from "@/constants";

export type SocketMessage = {
	type: string;
	payload?: any;
	[key: string]: any;
};

export function useSocket() {
	const [isConnected, setIsConnected] = useState(false);
	const socketRef = useRef<WebSocket | null>(null);
	const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null);

	const connect = useCallback(() => {
		if (socketRef.current?.readyState === WebSocket.OPEN) return;

		// Convert http/https to ws/wss
		const wsUrl = `${BACKEND_URL.replace(/^http/, "ws")}/ws`;
		const socket = new WebSocket(wsUrl);

		let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

		socket.onopen = () => {
			setIsConnected(true);
			console.log("Connected to WebSocket");

			// Start heartbeat
			heartbeatInterval = setInterval(() => {
				if (socket.readyState === WebSocket.OPEN) {
					socket.send(JSON.stringify({ type: "heartbeat" }));
				}
			}, 30000);
		};

		// Registered outside onopen so it fires even if the connection
		// is rejected before opening (auth failure, network error, etc.)
		socket.onclose = () => {
			setIsConnected(false);
			if (heartbeatInterval) {
				clearInterval(heartbeatInterval);
				heartbeatInterval = null;
			}
			console.log("WebSocket disconnected — reconnecting in 3s");
			setTimeout(connect, 3000);
		};

		socket.onerror = (event) => {
			console.error("WebSocket error", event);
			// onclose fires automatically after onerror, so reconnect happens there
		};

		socket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				setLastMessage(data);
			} catch (e) {
				console.error("Failed to parse WebSocket message", e);
			}
		};

		socketRef.current = socket;
	}, []);

	useEffect(() => {
		connect();
		return () => {
			// Prevent the onclose reconnect from firing after unmount
			const socket = socketRef.current;
			if (socket) {
				socket.onclose = null;
				socket.close();
			}
		};
	}, [connect]);

	const sendMessage = useCallback((message: SocketMessage) => {
		if (socketRef.current?.readyState === WebSocket.OPEN) {
			socketRef.current.send(JSON.stringify(message));
		}
	}, []);

	return { isConnected, lastMessage, sendMessage };
}
