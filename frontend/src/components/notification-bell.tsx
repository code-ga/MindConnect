import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { useEffect } from "react";

export function NotificationBell() {
	const queryClient = useQueryClient();
	const { lastMessage } = useSocket();

	const { data: notifications, isLoading } = useQuery({
		queryKey: ["notifications"],
		queryFn: async () => {
			const { data, error } = await api.api.notification.get();
			if (error) throw new Error(getErrorMessage(error));
			return data.data;
		},
	});

	const readMutation = useMutation({
		mutationFn: async (id: string) => {
			const { error } = await api.api.notification({ id }).read.patch();
			if (error) throw new Error(getErrorMessage(error));
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		},
	});

	useEffect(() => {
		if (lastMessage?.type === "notification") {
			queryClient.invalidateQueries({ queryKey: ["notifications"] });
		}
	}, [lastMessage, queryClient]);

	const unreadCount = notifications?.filter((n) => !n.readStatus).length || 0;
	if (isLoading) {
		return (
			<Button variant="ghost" size="icon" className="relative">
				<Loader2 className="h-5 w-5 animate-spin" />
			</Button>
		);
	}

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
						>
							{unreadCount}
						</Badge>
					)}
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Notifications</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
					{notifications?.length === 0 && (
						<p className="text-center text-muted-foreground py-10">
							No notifications yet.
						</p>
					)}
					{notifications?.map((n) => (
						<div
							key={n.id}
							className={`p-3 rounded-lg border flex flex-col gap-1 transition-colors ${
								!n.readStatus ? "bg-primary/5 border-primary/20" : "bg-card"
							}`}
							onClick={() => !n.readStatus && readMutation.mutate(n.id)}
						>
							<div className="flex justify-between items-start">
								<span className="font-semibold text-sm capitalize">
									{n.type.replace(/_/g, " ")}
								</span>
								<span className="text-[10px] text-muted-foreground">
									{new Date(n.createdAt).toLocaleString()}
								</span>
							</div>
							<p className="text-sm">{n.content}</p>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
