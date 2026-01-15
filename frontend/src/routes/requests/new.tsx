import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { z } from "zod";

const requestSearchSchema = z.object({
	type: z.enum(["role_request", "feature_request"]).optional(),
});

export const Route = createFileRoute("/requests/new")({
	component: NewRequest,
	validateSearch: (search) => requestSearchSchema.parse(search),
});

function NewRequest() {
	const search = Route.useSearch();
	const [type, setType] = useState<"role_request" | "feature_request">("role_request");
	const [content, setContent] = useState("");
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	useEffect(() => {
		if (search.type) {
			setType(search.type);
		}
	}, [search.type]);

	const mutation = useMutation({
		mutationFn: async (data: { type: "role_request" | "feature_request"; content: string }) => {
			const { data: response, error } = await api.api["user-request"].post(data);
			if (error) throw new Error(error.value?.message || "Failed to submit request");
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user-requests"] });
			navigate({ to: "/requests" });
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!content) return;
		mutation.mutate({ type, content });
	};

	return (
		<div className="container flex items-center justify-center min-h-[calc(100vh-64px)] py-10">
			<Card className="w-full max-w-lg">
				<CardHeader>
					<CardTitle>New Request</CardTitle>
					<CardDescription>
						Submit a request for a new role or a feature.
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="type">Request Type</Label>
							<Select value={type} onValueChange={(v: any) => setType(v)}>
								<SelectTrigger id="type">
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="role_request">Role Request</SelectItem>
									<SelectItem value="feature_request">Feature Request</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="content">Content</Label>
							<Textarea
								id="content"
								placeholder={type === "role_request" ? "What role are you requesting and why?" : "Tell us about the feature you'd like to see."}
								className="min-h-[150px]"
								value={content}
								onChange={(e) => setContent(e.target.value)}
								required
								disabled={mutation.isPending}
							/>
						</div>
						{mutation.error && (
							<p className="text-sm text-destructive">{mutation.error.message}</p>
						)}
					</CardContent>
					<CardFooter className="flex justify-between">
						<Button type="button" variant="outline" onClick={() => navigate({ to: "/requests" })} disabled={mutation.isPending}>
							Cancel
						</Button>
						<Button type="submit" disabled={mutation.isPending || !content}>
							{mutation.isPending ? "Submitting..." : "Submit Request"}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
