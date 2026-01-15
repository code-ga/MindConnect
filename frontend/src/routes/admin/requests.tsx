import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth-context";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/requests")({
	component: AdminRequests,
});

function AdminRequests() {
	const { hasPermission } = useAuth();
	const queryClient = useQueryClient();
	const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
	const [reason, setReason] = useState("");
	const [note, setNote] = useState("");
	const [showSupporter, setShowSupporter] = useState(true);
	const navigate = useNavigate();

	const { data: requests, isLoading, error } = useQuery({
		queryKey: ["admin-requests"],
		queryFn: async () => {
			const { data, error } = await api.api["user-request"].get();
			if (error) throw new Error(error.value?.message || "Failed to fetch requests");
			return data.data ;
		},
		enabled: hasPermission(["manager", "admin"]),
	});

	const processMutation = useMutation({
		mutationFn: async ({ id, status, reason, note }: { id: string; status: "accepted" | "rejected"; reason?: string; note?: string }) => {
			const { data, error } = await api.api["user-request"].process({ id }).put({ status, reason, note });
			if (error) throw new Error(error.value?.message || "Failed to process request");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
			setActiveRequestId(null);
			setReason("");
			setNote("");
		},
	});

	const requestChatMutation = useMutation({
		mutationFn: async ({ requestId, showSupporter }: { requestId: string; showSupporter: boolean }) => {
			const { data, error } = await api.api["user-request"]["request-private-chat-room"].post({ requestId, showSupporter });
			if (error) throw new Error(error.value?.message || "Failed to create chat room");
			return data.data;
		},
		onSuccess: (data) => {
			navigate({ to: "/chat/$id", params: { id: data.id } });
		},
	});

	if (!hasPermission(["manager", "admin"])) {
		return <div className="container py-10">Access Denied. You do not have permission to view this page.</div>;
	}

	if (isLoading) return <div className="container py-10">Loading...</div>;
	if (error) return <div className="container py-10 text-destructive">{(error as Error).message}</div>;

	return (
		<div className="container py-10 space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Manage Requests</h1>
				<p className="text-muted-foreground">Review and process user role and feature requests.</p>
			</div>

			<div className="grid gap-4">
				{requests?.map((request) => (
					<Card key={request.id}>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="capitalize">{request.type.replace("_", " ")}</CardTitle>
									<CardDescription>From User ID: {request.profileId} • Created on {new Date(request.createdAt).toLocaleDateString()}</CardDescription>
								</div>
								<div className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
									request.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
									request.status === "processing" ? "bg-blue-500/10 text-blue-500" :
									request.status === "accepted" ? "bg-green-500/10 text-green-500" :
									"bg-red-500/10 text-red-500"
								}`}>
									{request.status}
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<p className="whitespace-pre-wrap">{request.content}</p>
							
							{activeRequestId === request.id ? (
								<div className="mt-4 space-y-4 p-4 border rounded-md">
									<div className="space-y-2">
										<Label htmlFor={`reason-${request.id}`}>Rejection Reason (if rejecting)</Label>
										<Input 
											id={`reason-${request.id}`}
											placeholder="Why is this being rejected?" 
											value={reason}
											onChange={(e) => setReason(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor={`note-${request.id}`}>Internal Note</Label>
										<Textarea 
											id={`note-${request.id}`}
											placeholder="Internal note for other admins..." 
											value={note}
											onChange={(e) => setNote(e.target.value)}
										/>
									</div>
									<div className="flex gap-2">
										<Button 
											variant="default" 
											onClick={() => processMutation.mutate({ id: request.id, status: "accepted", note })}
											disabled={processMutation.isPending}
										>
											Accept
										</Button>
										<Button 
											variant="destructive" 
											onClick={() => {
												if (!reason) {
													alert("Reason is required for rejection");
													return;
												}
												processMutation.mutate({ id: request.id, status: "rejected", reason, note });
											}}
											disabled={processMutation.isPending}
										>
											Reject
										</Button>
										<Button variant="ghost" onClick={() => setActiveRequestId(null)}>Cancel</Button>
									</div>
								</div>
							) : request.status === "pending" || request.status === "processing" ? (
								<div className="mt-4 flex flex-wrap gap-2">
									<Button onClick={() => setActiveRequestId(request.id)}>Process Request</Button>
									{request.status === "pending" && (
										<Button 
											variant="outline" 
											onClick={() => processMutation.mutate({ id: request.id, status: "processing" })}
											disabled={processMutation.isPending}
										>
											Mark as Processing
										</Button>
									)}
									<Dialog>
										<DialogTrigger asChild>
											<Button variant="secondary">Request Chat</Button>
										</DialogTrigger>
										<DialogContent>
											<DialogHeader>
												<DialogTitle>Request Chat Room</DialogTitle>
												<DialogDescription>
													Create a private chat room to discuss this request with the user.
												</DialogDescription>
											</DialogHeader>
											<div className="flex items-center space-x-2 py-4">
												<Switch 
													id="show-supporter" 
													checked={showSupporter} 
													onCheckedChange={setShowSupporter}
												/>
												<Label htmlFor="show-supporter">Show my profile information to the user</Label>
											</div>
											<DialogFooter>
												<Button 
													onClick={() => requestChatMutation.mutate({ requestId: request.id, showSupporter })}
													disabled={requestChatMutation.isPending}
												>
													{requestChatMutation.isPending ? "Creating..." : "Create Chat Room"}
												</Button>
											</DialogFooter>
										</DialogContent>
									</Dialog>
								</div>
							) : (
								<div className="mt-4 p-3 rounded-md bg-muted text-sm space-y-2">
									{request.processedReason && (
										<div>
											<p className="font-semibold text-xs uppercase text-muted-foreground mb-1">Reason</p>
											<p>{request.processedReason}</p>
										</div>
									)}
									{request.processedNote && (
										<div>
											<p className="font-semibold text-xs uppercase text-muted-foreground mb-1">Internal Note</p>
											<p>{request.processedNote}</p>
										</div>
									)}
									<p className="text-xs text-muted-foreground">Processed by {request.processedBy} on {new Date(request.processedAt || "").toLocaleString()}</p>
								</div>
							)}
						</CardContent>
					</Card>
				))}
				{requests?.length === 0 && (
					<div className="text-center py-20 border-2 border-dashed rounded-lg">
						<p className="text-muted-foreground">No requests found to manage.</p>
					</div>
				)}
			</div>
		</div>
	);
}
