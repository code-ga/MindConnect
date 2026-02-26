import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export const Route = createFileRoute("/requests/")({
	component: RequestsListPage,
});

function RequestsListPage() {
	return (
		<ProtectedRoute requireAuth={true} requireProfile={true}>
			<RequestsList />
		</ProtectedRoute>
	);
}

interface UserRequest {
	id: string;
	userId: string;
	status: "pending" | "processing" | "accepted" | "rejected";
	content: string;
	type: "role_request" | "feature_request";
	createdAt: Date;
	processedReason?: string | null;
}

function RequestsList() {
	const { data: requests, isLoading, error } = useQuery({
		queryKey: ["user-requests"],
		queryFn: async () => {
			const { data, error } = await api.api["user-request"].get();
			if (error) throw new Error(error.value?.message || "Failed to fetch requests");
			return data.data as unknown as UserRequest[];
		},
	});

	if (isLoading) return <div className="container py-10">Loading...</div>;
	if (error) return <div className="container py-10 text-destructive">{(error as Error).message}</div>;

	return (
		<div className="container py-10 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">My Requests</h1>
					<p className="text-muted-foreground">Manage your role and feature requests.</p>
				</div>
				<Button asChild>
					<Link to="/requests/new">
						<Plus className="w-4 h-4 mr-2" />
						New Request
					</Link>
				</Button>
			</div>

			<div className="grid gap-4">
				{requests?.map((request) => (
					<Card key={request.id}>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<CardTitle className="capitalize">{request.type.replace("_", " ")}</CardTitle>
								<div className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
									request.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
									request.status === "processing" ? "bg-blue-500/10 text-blue-500" :
									request.status === "accepted" ? "bg-green-500/10 text-green-500" :
									"bg-red-500/10 text-red-500"
								}`}>
									{request.status}
								</div>
							</div>
							<CardDescription>Created on {new Date(request.createdAt).toLocaleDateString()}</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="whitespace-pre-wrap">{request.content}</p>
							{request.processedReason && (
								<div className="mt-4 p-3 rounded-md bg-muted text-sm">
									<p className="font-semibold text-xs uppercase text-muted-foreground mb-1">Reason</p>
									<p>{request.processedReason}</p>
								</div>
							)}
						</CardContent>
					</Card>
				))}
				{requests?.length === 0 && (
					<div className="text-center py-20 border-2 border-dashed rounded-lg">
						<p className="text-muted-foreground">You haven't made any requests yet.</p>
					</div>
				)}
			</div>
		</div>
	);
}
