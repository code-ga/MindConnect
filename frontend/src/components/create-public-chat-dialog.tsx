import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Globe, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function CreatePublicChatDialog() {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [open, setOpen] = useState(false);
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const createMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.api.chatroom.post({
				name,
				description,
				isGroupChat: true,
				type: "public-chat-room",
			});

			if (error) {
				throw new Error(getErrorMessage(error));
			}
			return data.data;
		},
		onSuccess: (newRoom) => {
			queryClient.invalidateQueries({ queryKey: ["chatrooms"] });
			setOpen(false);
			setName("");
			setDescription("");
			if (newRoom?.id) {
				navigate({ to: "/chat/$id", params: { id: newRoom.id } });
			}
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		createMutation.mutate();
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="default" size="sm" className="gap-2">
					<Plus size={16} />
					<Globe size={16} />
					<span className="hidden sm:inline">Public Chat</span>
				</Button>
			</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Create Public Chat Room</DialogTitle>
						<DialogDescription>
							Create a new space for everyone to join and discuss.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">Room Name</Label>
							<Input
								id="name"
								placeholder="e.g. Daily Motivation"
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								placeholder="What is this room about?"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								required
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={createMutation.isPending || !name.trim()}
						>
							{createMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating...
								</>
							) : (
								"Create Room"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
