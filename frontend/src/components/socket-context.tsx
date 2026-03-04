import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { BACKEND_URL } from "@/constants";

export type SocketMessage = {
	type: string;
	payload?: any;
	[key: string]: any;
};

interface SocketContextValue {
	isConnected: boolean;
	lastMessage: SocketMessage | null;
	sendMessage: (message: SocketMessage) => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({
	children,
	enabled = true,
}: {
	children: React.ReactNode;
	/** Pass false when the user is not authenticated to skip connecting */
	enabled?: boolean;
}) {
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState<SocketMessage | null>(null);
	const socketRef = useRef<WebSocket | null>(null);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const unmountedRef = useRef(false);

	const connect = useCallback(() => {
		if (!enabled) return;
		if (unmountedRef.current) return;
		if (socketRef.current?.readyState === WebSocket.OPEN) return;

		const wsUrl = `${BACKEND_URL.replace(/^http/, "ws")}/ws`;
		const socket = new WebSocket(wsUrl);

		let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

		socket.onopen = () => {
			if (unmountedRef.current) {
				socket.close();
				return;
			}
			setIsConnected(true);
			console.log("[ws] Connected");

			heartbeatInterval = setInterval(() => {
				if (socket.readyState === WebSocket.OPEN) {
					socket.send(JSON.stringify({ type: "heartbeat" }));
				}
			}, 30000);
		};

		// Registered outside onopen so it fires even on failed handshakes
		socket.onclose = () => {
			setIsConnected(false);
			if (heartbeatInterval) {
				clearInterval(heartbeatInterval);
				heartbeatInterval = null;
			}
			if (!unmountedRef.current && enabled) {
				console.log("[ws] Disconnected — reconnecting in 3s");
				reconnectTimerRef.current = setTimeout(connect, 3000);
			}
		};

		socket.onerror = (event) => {
			console.error("[ws] Error", event);
		};

		socket.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				setLastMessage(data);
			} catch {
				console.error("[ws] Failed to parse message", event.data);
			}
		};

		socketRef.current = socket;
	}, [enabled]);

	useEffect(() => {
		unmountedRef.current = false;
		connect();

		const handleVisibilityChange = () => {
			if (document.visibilityState !== "visible") return;
			if (socketRef.current?.readyState === WebSocket.OPEN) {
				// Tab came back — send heartbeat immediately so server doesn't stale us out
				socketRef.current.send(JSON.stringify({ type: "heartbeat" }));
			} else {
				// Socket was closed/closing while backgrounded — reconnect now
				if (reconnectTimerRef.current) {
					clearTimeout(reconnectTimerRef.current);
					reconnectTimerRef.current = null;
				}
				connect();
			}
		};

		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			unmountedRef.current = true;
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			if (reconnectTimerRef.current) {
				clearTimeout(reconnectTimerRef.current);
			}
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

	return (
		<SocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
			{children}
		</SocketContext.Provider>
	);
}

export function useSocket() {
	const ctx = useContext(SocketContext);
	if (!ctx) throw new Error("useSocket must be used within a SocketProvider");
	return ctx;
}
