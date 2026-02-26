import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useSocket } from "@/hooks/useSocket";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Zap } from "lucide-react";
import { useEffect, useState } from "react";

type Role = "listener" | "psychologist" | "therapist";
const AVAILABLE_ROLES: Role[] = ["listener", "psychologist", "therapist"];

interface WaiterStatusResponse {
	status: "idle" | "working" | "busy";
	roles: Role[];
}

export function WaiterStatusPanel(props: { userRoles: string[] }) {
	const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
	const [localStatus, setLocalStatus] = useState<
		"idle" | "working" | "busy"
	>("idle");
	const { lastMessage } = useSocket();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// Filter available roles to only those the user has
	const userWaiterRoles = AVAILABLE_ROLES.filter((role) =>
		props.userRoles.includes(role),
	);

	// Fetch waiter status on mount
	const { data: statusData } = useQuery({
		queryKey: ["waiter-status"],
		queryFn: async () => {
			const { data, error } = await api.api.match.waiter.status.get();
			if (error) throw new Error(getErrorMessage(error));
			return data.data as WaiterStatusResponse;
		},
	});

	// Initialize state from server
	useEffect(() => {
		if (statusData) {
			setLocalStatus(statusData.status);
			setSelectedRoles(statusData.roles);
		}
	}, [statusData]);

	const startWorkingMutation = useMutation({
		mutationFn: async () => {
			if (selectedRoles.length === 0) {
				throw new Error("Please select at least one role");
			}
			const { data, error } = await api.api.match.waiter.working.post({
				roles: selectedRoles,
			});
			if (error) throw new Error(getErrorMessage(error));
			return data;
		},
		onSuccess: () => {
			setLocalStatus("working");
			queryClient.invalidateQueries({ queryKey: ["waiter-status"] });
		},
		onError: (error) => {
			console.error("Failed to start working:", error);
		},
	});

	const stopWorkingMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.api.match.waiter.idle.post();
			if (error) throw new Error(getErrorMessage(error));
			return data;
		},
		onSuccess: () => {
			setLocalStatus("idle");
			setSelectedRoles([]);
			queryClient.invalidateQueries({ queryKey: ["waiter-status"] });
		},
		onError: (error) => {
			console.error("Failed to stop working:", error);
		},
	});

	// Listen for match success
	useEffect(() => {
		if (lastMessage?.type === "match_success") {
			setLocalStatus("busy");
			const roomId = lastMessage.payload.chatRoomId;
			// Small delay to ensure UI updates
			setTimeout(() => {
				navigate({ to: "/chat/$id", params: { id: roomId } });
			}, 100);
		}
	}, [lastMessage, navigate]);

	const getStatusColor = () => {
		switch (localStatus) {
			case "working":
				return "text-green-600";
			case "busy":
				return "text-yellow-600";
			default:
				return "text-gray-600";
		}
	};

	const getStatusLabel = () => {
		if (localStatus === "busy") {
			return "In Session";
		}
		return localStatus.charAt(0).toUpperCase() + localStatus.slice(1);
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Zap className="h-5 w-5" />
							Helper Mode
						</CardTitle>
						<CardDescription>
							Manage your availability for supporting others
						</CardDescription>
					</div>
					<div className={`text-sm font-semibold ${getStatusColor()}`}>
						● {getStatusLabel()}
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{localStatus === "idle" ? (
					<>
						<div>
							<Label className="mb-3 block font-semibold">
								Select roles to serve as:
							</Label>
							<div className="space-y-2">
								{userWaiterRoles.map((role) => (
									<div
										key={role}
										className="flex items-center space-x-2"
									>
										<Checkbox
											id={`role-${role}`}
											checked={selectedRoles.includes(
												role,
											)}
											onCheckedChange={(checked) => {
												setSelectedRoles((prev) =>
													checked
														? [...prev, role]
														: prev.filter(
																(r) => r !== role,
														),
												);
											}}
											disabled={
												startWorkingMutation.isPending
											}
										/>
										<Label
											htmlFor={`role-${role}`}
											className="capitalize cursor-pointer"
										>
											{role}
										</Label>
									</div>
								))}
							</div>
						</div>
						<Button
							className="w-full"
							disabled={
								selectedRoles.length === 0 ||
								startWorkingMutation.isPending
							}
							onClick={() =>
								startWorkingMutation.mutate()
							}
						>
							{startWorkingMutation.isPending
								? "Starting..."
								: "Start Working"}
						</Button>
					</>
				) : (
					<>
						<div>
							<p className="text-sm text-gray-600 mb-2">
								Currently serving as:
							</p>
							<div className="flex flex-wrap gap-2">
								{selectedRoles.map((role) => (
									<div
										key={role}
										className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize"
									>
										{role}
									</div>
								))}
							</div>
						</div>
						{localStatus === "working" && (
							<Button
								variant="destructive"
								className="w-full"
								disabled={stopWorkingMutation.isPending}
								onClick={() =>
									stopWorkingMutation.mutate()
								}
							>
								{stopWorkingMutation.isPending
									? "Stopping..."
									: "Stop Working"}
							</Button>
						)}
						{localStatus === "busy" && (
							<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
								You're currently in a session. Leave the chat
								room to become available again.
							</div>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
