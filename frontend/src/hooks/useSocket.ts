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

		socket.onopen = () => {
			setIsConnected(true);
			console.log("Connected to WebSocket");

			// Start heartbeat
			const heartbeatInterval = setInterval(() => {
				if (socket.readyState === WebSocket.OPEN) {
					socket.send(JSON.stringify({ type: "heartbeat" }));
				}
			}, 30000);

			socket.onclose = () => {
				setIsConnected(false);
				clearInterval(heartbeatInterval);
				console.log("Disconnected from WebSocket");
				// Reconnect after delay
				setTimeout(connect, 3000);
			};
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
			socketRef.current?.close();
		};
	}, [connect]);

	const sendMessage = useCallback((message: SocketMessage) => {
		if (socketRef.current?.readyState === WebSocket.OPEN) {
			socketRef.current.send(JSON.stringify(message));
		}
	}, []);

	return { isConnected, lastMessage, sendMessage };
}
