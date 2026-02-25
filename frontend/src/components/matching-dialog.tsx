import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";

export function MatchingDialog() {
	const [isOpen, setIsOpen] = useState(false);
	const [isMatching, setIsMatching] = useState(false);
	const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
	// const queryClient = useQueryClient();
	const navigate = useNavigate();
	const { lastMessage } = useSocket();

	const startMatchingMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.api.match.start.post({
				roles: selectedRoles,
			});
			if (error) throw new Error(getErrorMessage(error));
			return data;
		},
		onSuccess: () => {
			setIsMatching(true);
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

	const toggleRole = (role: string) => {
		setSelectedRoles((prev) =>
			prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
		);
	};

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
						Select the roles you are looking to connect with. We'll find someone
						for you.
					</DialogDescription>
				</DialogHeader>

				{!isMatching ? (
					<div className="space-y-4 py-4">
						<div className="grid gap-4">
							{["listener", "psychologist", "therapist"].map((role) => (
								<div key={role} className="flex items-center space-x-2">
									<Checkbox
										id={role}
										checked={selectedRoles.includes(role)}
										onCheckedChange={() => toggleRole(role)}
									/>
									<Label htmlFor={role} className="capitalize">
										{role}
									</Label>
								</div>
							))}
						</div>
						<Button
							className="w-full"
							disabled={
								selectedRoles.length === 0 || startMatchingMutation.isPending
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
