import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

type Role = "listener" | "psychologist" | "therapist";

export function MatchingDialog() {
	const [isOpen, setIsOpen] = useState(false);
	const [isMatching, setIsMatching] = useState(false);
	const [selectedRole, setSelectedRole] = useState<Role | null>(null);
	const navigate = useNavigate();
	const { lastMessage } = useSocket();

	// Fetch status on mount to restore state after page refresh
	const { data: statusData } = useQuery({
		queryKey: ["match-status"],
		queryFn: async () => {
			const { data, error } = await api.api.match.status.get();
			if (error) throw new Error(getErrorMessage(error));
			return data.data;
		},
	});

	// Initialize matching state from server
	useEffect(() => {
		if (statusData?.inQueue) {
			setIsMatching(true);
			setIsOpen(true);
			setSelectedRole(statusData.requestedRole || null);
		}
	}, [statusData]);

	const startMatchingMutation = useMutation({
		mutationFn: async () => {
			if (!selectedRole) throw new Error("Please select a role");
			const { data, error } = await api.api.match.start.post({
				role: selectedRole,
			});
			if (error) throw new Error(getErrorMessage(error));
			return data;
		},
		onSuccess: () => {
			setIsMatching(true);
		},
		onError: (error) => {
			console.error("Failed to start matching:", error);
		},
	});

	const stopMatchingMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.api.match.stop.post();
			if (error) throw new Error(getErrorMessage(error));
			return data;
		},
		onSuccess: () => {
			setIsMatching(false);
			setIsOpen(false);
			setSelectedRole(null);
		},
		onError: (error) => {
			console.error("Failed to stop matching:", error);
		},
	});

	useEffect(() => {
		if (lastMessage?.type === "match_success") {
			setIsMatching(false);
			setIsOpen(false);
			const roomId = lastMessage.payload.chatRoomId;
			navigate({ to: "/chat/$id", params: { id: roomId } });
		}
	}, [lastMessage, navigate]);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button className="gap-2">
					<UserPlus className="h-4 w-4" />
					Find a Match
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Find a Support Match</DialogTitle>
					<DialogDescription>
						Select the type of support you are looking for. We'll find someone
						for you.
					</DialogDescription>
				</DialogHeader>

				{!isMatching ? (
					<div className="space-y-4 py-4">
						<div className="grid gap-4">
							{(["listener", "psychologist", "therapist"] as Role[]).map(
								(role) => (
									<div key={role} className="flex items-center space-x-2">
										<Checkbox
											id={role}
											checked={selectedRole === role}
											onCheckedChange={(checked) =>
												setSelectedRole(checked ? role : null)
											}
										/>
										<Label htmlFor={role} className="capitalize cursor-pointer">
											{role}
										</Label>
									</div>
								),
							)}
						</div>
						<Button
							className="w-full"
							disabled={
								!selectedRole || startMatchingMutation.isPending
							}
							onClick={() => startMatchingMutation.mutate()}
						>
							{startMatchingMutation.isPending
								? "Starting..."
								: "Start Matching"}
						</Button>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-10 space-y-4">
						<Loader2 className="h-10 w-10 animate-spin text-primary" />
						<p className="font-medium animate-pulse">
							Searching for a match...
						</p>
						<Button
							variant="outline"
							size="sm"
							onClick={() => stopMatchingMutation.mutate()}
							disabled={stopMatchingMutation.isPending}
						>
							Cancel Matching
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
