import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestListenerButton } from "@/components/request-listener-button";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
});

function SettingsPage() {
	const { profile, refreshProfile } = useAuth();
	const [username, setUsername] = useState("");
	const [loading, setLoading] = useState(false);
	const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

	useEffect(() => {
		if (profile) {
			setUsername(profile.username);
		}
	}, [profile]);

	const handleUpdateUsername = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!username || username === profile?.username) return;

		setLoading(true);
		setMessage(null);

		try {
			const { data, error } = await api.api.profile.put({ username });
			if (error) {
				setMessage({ type: "error", text: error.value?.message || "Failed to update username" });
			} else if (data?.success) {
				setMessage({ type: "success", text: "Username updated successfully!" });
				await refreshProfile();
			}
		} catch (_err) {
			setMessage({ type: "error", text: "An unexpected error occurred" });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="container py-10 space-y-8">
			<div>
				<h1 className="text-3xl font-bold">Settings</h1>
				<p className="text-muted-foreground">Manage your account settings and preferences.</p>
			</div>

			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Profile Information</CardTitle>
						<CardDescription>Update your public profile details.</CardDescription>
					</CardHeader>
					<form onSubmit={handleUpdateUsername}>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="username">Username</Label>
								<Input 
									id="username" 
									value={username} 
									onChange={(e) => setUsername(e.target.value)}
									disabled={loading}
								/>
							</div>
							{message && (
								<p className={`text-sm ${message.type === "success" ? "text-green-500" : "text-destructive"}`}>
									{message.text}
								</p>
							)}
						</CardContent>
						<CardFooter>
							<Button type="submit" disabled={loading || username === profile?.username}>
								{loading ? "Saving..." : "Save Changes"}
							</Button>
						</CardFooter>
					</form>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Linked Accounts</CardTitle>
						<CardDescription>Manage your connected social accounts.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between p-3 border rounded-md">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">G</div>
								<div>
									<p className="font-medium">Google</p>
									<p className="text-xs text-muted-foreground italic">Connected as example@gmail.com</p>
								</div>
							</div>
							<Button variant="outline" size="sm">Disconnect</Button>
						</div>
						<div className="flex items-center justify-between p-3 border rounded-md">
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">GH</div>
								<p className="font-medium">GitHub</p>
							</div>
							<Button variant="default" size="sm">Connect</Button>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Special Actions</CardTitle>
						<CardDescription>Request specialized roles or features.</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Listener Role</p>
								<p className="text-sm text-muted-foreground">Apply to become a verified listener.</p>
							</div>
							<RequestListenerButton />
						</div>
					</CardContent>
				</Card>

				<Card className="border-destructive">
					<CardHeader>
						<CardTitle className="text-destructive">Danger Zone</CardTitle>
						<CardDescription>Irreversible actions for your account.</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="destructive">Delete Account</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
