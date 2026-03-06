import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useSocket } from "@/components/socket-context";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";

export function PeerMatchingDialog() {
	const [isOpen, setIsOpen] = useState(false);
	const [isMatching, setIsMatching] = useState(false);
	const navigate = useNavigate();
	const { lastMessage } = useSocket();

	// Poll status on mount to restore state, and every 2s while matching as WS fallback
	const { data: statusData } = useQuery({
		queryKey: ["peer-status"],
		queryFn: async () => {
			const { data, error } = await api.api.match.peer.status.get();
			if (error) throw new Error(getErrorMessage(error));
			return data.data;
		},
		refetchInterval: isMatching ? 2000 : false,
	});

	// Restore state from server and handle match found via poll fallback
	useEffect(() => {
		if (!statusData) return;
		if (statusData.matchedChatRoomId) {
			setIsMatching(false);
			setIsOpen(false);
			navigate({ to: "/chat/$id", params: { id: statusData.matchedChatRoomId } });
		} else if (statusData.inPool) {
			setIsMatching(true);
			setIsOpen(true);
		}
	}, [statusData, navigate]);

	const joinMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.api.match.peer.join.post();
			if (error) throw new Error(getErrorMessage(error));
			return data;
		},
		onSuccess: () => {
			setIsMatching(true);
		},
		onError: (error) => {
			console.error("Failed to join peer pool:", error);
		},
	});

	const leaveMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.api.match.peer.leave.post();
			if (error) throw new Error(getErrorMessage(error));
			return data;
		},
		onSuccess: () => {
			setIsMatching(false);
			setIsOpen(false);
		},
		onError: (error) => {
			console.error("Failed to leave peer pool:", error);
		},
	});

	// Handle match found via WebSocket
	useEffect(() => {
		if (lastMessage?.type === "match_success" && isMatching) {
			setIsMatching(false);
			setIsOpen(false);
			const roomId = lastMessage.payload.chatRoomId;
			navigate({ to: "/chat/$id", params: { id: roomId } });
		}
	}, [lastMessage, isMatching, navigate]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" className="gap-2">
					<Users className="h-4 w-4" />
					Chat with Someone
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Chat with a Random Person</DialogTitle>
					<DialogDescription>
						Connect with another online user for a casual conversation. No roles
						required.
					</DialogDescription>
				</DialogHeader>

				{!isMatching ? (
					<div className="space-y-4 py-4">
						<p className="text-sm text-muted-foreground">
							You'll be matched with another user who is also looking to chat.
							The conversation is private between the two of you.
						</p>
						<Button
							className="w-full"
							disabled={joinMutation.isPending}
							onClick={() => joinMutation.mutate()}
						>
							{joinMutation.isPending ? "Joining..." : "Find Someone to Chat"}
						</Button>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-10 space-y-4">
						<Loader2 className="h-10 w-10 animate-spin text-primary" />
						<p className="font-medium animate-pulse">
							Looking for someone to chat with...
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => leaveMutation.mutate()}
							disabled={leaveMutation.isPending}
						>
							Cancel
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
