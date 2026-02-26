import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import {
	Users,
	User,
	ArrowRight,
	MessageCircle,
	Globe,
	LogIn,
} from "lucide-react";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchingDialog } from "@/components/matching-dialog";
import { WaiterStatusPanel } from "@/components/waiter-status-panel";

export const Route = createFileRoute("/chat/")({
	component: ChatList,
});

function ChatList() {
	const [view, setView] = useState<"my-chats" | "discover">("my-chats");
	const [filter, setFilter] = useState<
		"all" | "support" | "therapy" | "public"
	>("all");
	const queryClient = useQueryClient();
	const { profile, hasPermission } = useAuth();

	const {
		data: chatrooms,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["chatrooms", view, filter],
		queryFn: async () => {
			const query = filter !== "all" ? { category: filter } : {};

			if (view === "my-chats") {
				const { data, error } = await api.api.chatroom.get({
					query: query,
				});
				if (error) {
					throw new Error(getErrorMessage(error));
				}
				return data.data;
			} else {
				const { data, error } = await api.api.chatroom.discover.get({
					query: query,
				});
				if (error) {
					throw new Error(getErrorMessage(error));
				}
				return data.data;
			}
		},
	});

	const joinMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.api.chatroom({ id }).join.post();
			if (error) {
				throw new Error(getErrorMessage(error));
			}
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["chatrooms"] });
		},
	});

	if (isLoading) return <div className="container py-10">Loading chats...</div>;
	if (error)
		return (
			<div className="container py-10 text-destructive">
				{(error as Error).message}
			</div>
		);

	const getIcon = (type: string) => {
		if (!type) return <User className="h-5 w-5" />;
		if (type === "public-chat-room") return <Globe className="h-5 w-5" />;
		if (type.includes("group")) return <Users className="h-5 w-5" />;
		return <User className="h-5 w-5" />;
	};

	const getTypeLabel = (type: string) => {
		return type
			? type.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
			: "Unknown";
	};

	// Check if user has waiter roles
	const isWaiter = hasPermission?.(["listener", "psychologist", "therapist"]) ?? false;

	return (
		<div className="container py-10 space-y-6">
			{isWaiter && profile && (
				<WaiterStatusPanel userRoles={profile.permission} />
			)}

			<div className="flex flex-col gap-4">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold">
							{view === "my-chats" ? "My Chats" : "Discover"}
						</h1>
						<p className="text-muted-foreground">
							{view === "my-chats"
								? "Manage and view your support and therapy sessions."
								: "Find and join new public chat rooms."}
						</p>
					</div>
					<Tabs
						value={view}
						onValueChange={(v) => setView(v as "my-chats" | "discover")}
					>
						<TabsList>
							<TabsTrigger value="my-chats">My Chats</TabsTrigger>
							<TabsTrigger value="discover">Discover</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>

				<div className="flex justify-between items-center bg-muted p-1 rounded-lg w-full">
					<div className="flex">
						<Button
							variant={filter === "all" ? "default" : "ghost"}
							size="sm"
							onClick={() => setFilter("all")}
							className="h-8"
						>
							All
						</Button>
						<Button
							variant={filter === "support" ? "default" : "ghost"}
							size="sm"
							onClick={() => setFilter("support")}
							className="h-8"
						>
							Support
						</Button>
						<Button
							variant={filter === "therapy" ? "default" : "ghost"}
							size="sm"
							onClick={() => setFilter("therapy")}
							className="h-8"
						>
							Therapy
						</Button>
						<Button
							variant={filter === "public" ? "default" : "ghost"}
							size="sm"
							onClick={() => setFilter("public")}
							className="h-8"
						>
							Public
						</Button>
					</div>
					<MatchingDialog />
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{chatrooms?.map((room) => (
					<div
						key={room.id}
						className="block transition-transform hover:scale-[1.02]"
					>
						<Card>
							<CardHeader className="pb-2">
								<div className="flex justify-between items-start">
									<div className="p-2 bg-primary/10 rounded-full text-primary">
										{getIcon(room.type)}
									</div>
									<Badge
										variant={room.status === "active" ? "default" : "secondary"}
									>
										{room.status}
									</Badge>
								</div>
								<CardTitle className="mt-4 text-lg capitalize truncate">
									{room.name || getTypeLabel(room.type)}
								</CardTitle>
								<CardDescription className="line-clamp-1">
									ID: {room.id}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="text-sm text-muted-foreground">
									{room.participantIds.length} Participants
								</div>
								<div className="text-xs text-muted-foreground mt-2">
									Created: {new Date(room.createdAt).toLocaleDateString()}
								</div>
							</CardContent>
							<CardFooter className="pt-0">
								{view === "my-chats" ? (
									<Link
										to="/chat/$id"
										params={{ id: room.id }}
										className="w-full"
									>
										<Button
											variant="link"
											className="px-0 ml-auto flex items-center gap-1 w-full justify-end"
										>
											Open Chat <ArrowRight className="h-4 w-4" />
										</Button>
									</Link>
								) : (
									<Button
										className="w-full flex items-center gap-2"
										onClick={() => joinMutation.mutate(room.id)}
										disabled={joinMutation.isPending}
									>
										<LogIn className="h-4 w-4" />
										{joinMutation.isPending ? "Joining..." : "Join Chat"}
									</Button>
								)}
							</CardFooter>
						</Card>
					</div>
				))}
				{chatrooms?.length === 0 && (
					<div className="col-span-full text-center py-20 border-2 border-dashed rounded-lg">
						<MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
						<p className="text-muted-foreground">
							{view === "discover"
								? "No new chat rooms found to join."
								: "No chats found for this filter."}
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
