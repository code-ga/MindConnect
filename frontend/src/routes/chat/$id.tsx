import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useSocket } from "@/hooks/useSocket";
import { LogOut, Send } from "lucide-react";

export const Route = createFileRoute("/chat/$id")({
	component: ChatRoom,
});

function ChatRoom() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [messageText, setMessageText] = useState("");
	const { lastMessage, sendMessage } = useSocket();
	const scrollRef = useRef<HTMLDivElement>(null);

	const { data: chatroom, isLoading: isLoadingRoom } = useQuery({
		queryKey: ["chatroom", id],
		queryFn: async () => {
			const { data, error } = await api.api.chatroom({ id }).get();
			if (error)
				throw new Error(error.value?.message || "Failed to fetch chatroom");
			return data.data;
		},
	});

	const { data: messages, isLoading: isLoadingMessages } = useQuery({
		queryKey: ["chatroom-messages", id],
		queryFn: async () => {
			const { data, error } = await api.api.chatroom({ id }).messages.get();
			if (error)
				throw new Error(error.value?.message || "Failed to fetch messages");
			return data.data;
		},
	});

	const { data: participants, isLoading: isLoadingParticipants } = useQuery({
		queryKey: ["chatroom-participants", chatroom?.participantIds],
		queryFn: async () => {
			if (!chatroom?.participantIds) return [];
			const pInfos = await Promise.all(
				chatroom.participantIds.map(async (pId: string) => {
					const { data, error } = await api.api.profile.get({
						query: {
							profileId: pId,
						},
					});
					if (error) return null;
					return data.data;
				}),
			);
			return pInfos.filter((p) => p !== null);
		},
		enabled: !!chatroom?.participantIds,
	});

	const leaveMutation = useMutation({
		mutationFn: async () => {
			const { error } = await api.api.chatroom({ id }).leave.post();
			if (error) throw new Error("Failed to leave chatroom");
		},
		onSuccess: () => {
			navigate({ to: "/chat" });
		},
	});

	useEffect(() => {
		if (
			lastMessage?.type === "new_message" &&
			lastMessage.payload.chatRoomId === id
		) {
			queryClient.invalidateQueries({ queryKey: ["chatroom-messages", id] });
		}
	}, [lastMessage, id, queryClient]);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!messageText.trim()) return;

		try {
			const { error } = await api.api.chatroom({ id }).messages.post({
				content: messageText,
			});
			if (error) throw new Error("Failed to send message");
			setMessageText("");
		} catch (err) {
			console.error("Error sending message:", err);
		}
	};

	if (isLoadingRoom || isLoadingMessages || isLoadingParticipants)
		return <div className="container py-10">Loading...</div>;

	const getParticipantUsername = (pId: string) => {
		return participants?.find((p) => p.id === pId)?.username || pId;
	};

	const isOnline = (pId: string) => {
		// Mock online status check - in a real app, this would be based on lastSeen from backend
		const participant = participants?.find((p) => p.id === pId);
		if (!participant) return false;
		const lastSeen = new Date(participant.lastSeen).getTime();
		return Date.now() - lastSeen < 60000; // Online if seen in last 60s
	};

	return (
		<div className="container py-10 space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-3xl font-bold">
						{chatroom?.name || "Chat Room"}
					</h1>
					<p className="text-muted-foreground">ID: {id}</p>
				</div>
				<Button
					variant="outline"
					className="text-destructive gap-2"
					onClick={() => leaveMutation.mutate()}
				>
					<LogOut className="h-4 w-4" />
					Leave Room
				</Button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="md:col-span-2 flex flex-col h-[600px]">
					<CardHeader className="border-b">
						<CardTitle>Messages</CardTitle>
					</CardHeader>
					<CardContent
						className="flex-1 overflow-y-auto p-4 space-y-4"
						ref={scrollRef}
					>
						{messages?.map((msg) => (
							<div key={msg.id} className="p-3 rounded-lg bg-muted max-w-[80%]">
								<p className="text-xs font-semibold text-muted-foreground mb-1">
									{getParticipantUsername(msg.senderId)}
								</p>
								<p>{msg.content}</p>
								<p className="text-[10px] text-muted-foreground text-right mt-1">
									{new Date(msg.createdAt).toLocaleTimeString()}
								</p>
							</div>
						))}
						{messages?.length === 0 && (
							<p className="text-center text-muted-foreground py-20">
								No messages yet. Start the conversation!
							</p>
						)}
					</CardContent>
					<CardFooter className="border-t p-4">
						<form onSubmit={handleSendMessage} className="flex w-full gap-2">
							<Input
								placeholder="Type your message..."
								value={messageText}
								onChange={(e) => setMessageText(e.target.value)}
							/>
							<Button type="submit" size="icon">
								<Send className="h-4 w-4" />
							</Button>
						</form>
					</CardFooter>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<p className="text-sm font-semibold text-muted-foreground">
								Status
							</p>
							<Badge>{chatroom?.status}</Badge>
						</div>
						<div>
							<p className="text-sm font-semibold text-muted-foreground">
								Type
							</p>
							<p className="capitalize">{chatroom?.type.replace(/-/g, " ")}</p>
						</div>
						<div>
							<p className="text-sm font-semibold text-muted-foreground">
								Participants
							</p>
							<div className="space-y-2 mt-2">
								{chatroom?.participantIds.map((pId: string) => (
									<div key={pId} className="flex items-center gap-2">
										<div
											className={`h-2 w-2 rounded-full ${isOnline(pId) ? "bg-green-500" : "bg-gray-300"}`}
										/>
										<p className="text-sm truncate">
											{getParticipantUsername(pId)}
										</p>
									</div>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
