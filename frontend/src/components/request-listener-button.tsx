import { useNavigate } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { useAuth } from "./auth-context";

export function RequestListenerButton() {
	const { profile } = useAuth();
	const navigate = useNavigate();

	if (profile?.permission.includes("listener")) {
		return <Button disabled variant="outline">You are a Listener</Button>;
	}

	return (
		<Button 
			onClick={() => navigate({ to: "/requests/new", search: { type: "role_request" } })}
		>
			Request Listener Role
		</Button>
	);
}
