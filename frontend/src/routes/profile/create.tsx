import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/components/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/profile/create")({
	component: ProfileCreate,
});

function ProfileCreate() {
	const [username, setUsername] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { refreshProfile } = useAuth();
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!username) return;

		setLoading(true);
		setError(null);

		try {
			const { data, error: apiError } = await api.api.profile.post({
				username,
			});

			if (apiError) {
				setError(apiError.value?.message || "Failed to create profile");
			} else if (data?.success) {
				await refreshProfile();
				navigate({ to: "/dashboard" });
			}
		} catch (_err) {
			setError("An unexpected error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container flex items-center justify-center min-h-[calc(100vh-64px)] py-10">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>Create Profile</CardTitle>
					<CardDescription>
						Please set up your profile to continue.
					</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit}>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								placeholder="Enter your username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								disabled={loading}
							/>
						</div>
						{error && <p className="text-sm text-destructive">{error}</p>}
					</CardContent>
					<CardFooter>
						<Button type="submit" className="w-full" disabled={loading || !username}>
							{loading ? "Creating..." : "Create Profile"}
						</Button>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}
