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
import { useMatchableRoles } from "@/hooks/useRoles";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

export function MatchingDialog() {
	const [isOpen, setIsOpen] = useState(false);
	const [isMatching, setIsMatching] = useState(false);
	const [selectedRole, setSelectedRole] = useState<string | null>(null);
	const navigate = useNavigate();
	const { lastMessage } = useSocket();
	const { data: matchableRoles = [], isLoading: rolesLoading } =
		useMatchableRoles();

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
							{rolesLoading ? (
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<Loader2 className="h-4 w-4 animate-spin" />
									Loading roles...
								</div>
							) : (
								matchableRoles.map((r) => (
									<div key={r.name} className="flex items-center space-x-2">
										<Checkbox
											id={r.name}
											checked={selectedRole === r.name}
											onCheckedChange={(checked) =>
												setSelectedRole(checked ? r.name : null)
											}
										/>
										<Label
											htmlFor={r.name}
											className="capitalize cursor-pointer"
										>
											{r.name}
										</Label>
									</div>
								))
							)}
						</div>
						<Button
							className="w-full"
							disabled={!selectedRole || startMatchingMutation.isPending}
							onClick={() => startMatchingMutation.mutate()}
						>
							{startMatchingMutation.isPending ? "Starting..." : "Start Matching"}
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
