import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/chat/$id")({
	component: ChatRoom,
});

function ChatRoom() {
	const { id } = Route.useParams();

	const { data: chatroom, isLoading: isLoadingRoom } = useQuery({
		queryKey: ["chatroom", id],
		queryFn: async () => {
			const { data, error } = await api.api.chatroom[id].get();
			if (error) throw new Error(error.value?.message || "Failed to fetch chatroom");
			return data.data;
		},
	});

	const { data: messages, isLoading: isLoadingMessages } = useQuery({
		queryKey: ["chatroom-messages", id],
		queryFn: async () => {
			const { data, error } = await api.api.chatroom[id].messages.get();
			if (error) throw new Error(error.value?.message || "Failed to fetch messages");
			return data.data;
		},
	});

	if (isLoadingRoom || isLoadingMessages) return <div className="container py-10">Loading...</div>;

	return (
		<div className="container py-10 space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Chat Room</h1>
				<p className="text-muted-foreground">ID: {id}</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card className="md:col-span-2 flex flex-col h-[600px]">
					<CardHeader className="border-b">
						<CardTitle>Messages</CardTitle>
					</CardHeader>
					<CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
						{messages?.map((msg: any) => (
							<div key={msg.id} className="p-3 rounded-lg bg-muted max-w-[80%]">
								<p className="text-xs font-semibold text-muted-foreground mb-1">{msg.senderId}</p>
								<p>{msg.content}</p>
								<p className="text-[10px] text-muted-foreground text-right mt-1">
									{new Date(msg.createdAt).toLocaleTimeString()}
								</p>
							</div>
						))}
						{messages?.length === 0 && <p className="text-center text-muted-foreground">No messages yet.</p>}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<p className="text-sm font-semibold text-muted-foreground">Status</p>
							<Badge>{chatroom?.status}</Badge>
						</div>
						<div>
							<p className="text-sm font-semibold text-muted-foreground">Type</p>
							<p className="capitalize">{chatroom?.type.replace(/-/g, " ")}</p>
						</div>
						<div>
							<p className="text-sm font-semibold text-muted-foreground">Participants</p>
							<div className="space-y-1 mt-1">
								{chatroom?.participantIds.map((pId: string) => (
									<p key={pId} className="text-sm truncate">{pId}</p>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
