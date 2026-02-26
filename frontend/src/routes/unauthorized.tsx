import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/unauthorized")({
	component: UnauthorizedPage,
});

function UnauthorizedPage() {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<AlertCircle className="h-12 w-12 text-destructive" />
					</div>
					<CardTitle>Access Denied</CardTitle>
					<CardDescription>
						You don't have permission to access this resource
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<p className="text-sm text-muted-foreground">
						This page requires specific permissions or roles. If you believe this is a mistake, please
						contact support or try logging in with a different account.
					</p>
					<div className="flex gap-3">
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => navigate({ to: "/chat" })}
						>
							<ArrowLeft className="h-4 w-4 mr-2" />
							Go to Chat
						</Button>
						<Button
							className="flex-1"
							onClick={() => window.history.back()}
						>
							Go Back
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
