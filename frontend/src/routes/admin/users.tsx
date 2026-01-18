import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-context";
import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, UserCog, Plus, X, Loader2 } from "lucide-react";

interface Profile {
	id: string;
	userId: string;
	username: string;
	permission: string[];
}

export const Route = createFileRoute("/admin/users")({
	component: AdminUsers,
});

function AdminUsers() {
	const { hasPermission } = useAuth();
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState("");
	const [searchType, setSearchType] = useState<"username" | "userId">(
		"username",
	);
	const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
	const [roleToAdd, setRoleToAdd] = useState<string>("");

	const {
		data: users,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["admin-users", searchQuery, searchType],
		queryFn: async () => {
			if (!searchQuery) {
				const { data, error } = await api.api.profile["list-user"].get();
				if (error) {
					const errVal = error.value;
					// biome-ignore lint/suspicious/noExplicitAny: generic error handling
					const msg =
						typeof errVal === "string"
							? errVal
							: (errVal as any)?.message || "Failed to fetch users";
					throw new Error(msg);
				}
				return data.data;
			} else {
				const query =
					searchType === "username"
						? { type: "username" as const, username: searchQuery }
						: { type: "userId" as const, userId: searchQuery };

				const { data, error } = await api.api.profile["search_user"].get({
					query: query,
				});
				if (error) {
					const errVal = error.value;
					// biome-ignore lint/suspicious/noExplicitAny: generic error handling
					const msg =
						typeof errVal === "string"
							? errVal
							: (errVal as any)?.message || "Failed to search users";
					throw new Error(msg);
				}
				return data.data;
			}
		},
		enabled: hasPermission(["manager", "admin"]),
	});

	const { data: availableRoles } = useQuery({
		queryKey: ["available-roles"],
		queryFn: async () => {
			const { data: rolesData, error } =
				await api.api.profile["available-role"].get();
			if (error) {
				const errVal = error.value;
				// biome-ignore lint/suspicious/noExplicitAny: generic error handling
				const msg =
					typeof errVal === "string"
						? errVal
						: (errVal as any)?.message || "Failed to fetch roles";
				throw new Error(msg);
			}
			return rolesData.data;
		},
		enabled: hasPermission(["manager", "admin"]),
	});

	const addRoleMutation = useMutation({
		mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
			const { data, error } = await api.api.profile["add_role"].patch({
				// biome-ignore lint/suspicious/noExplicitAny: casting for eden treaty strict typing
				permission: [role] as any[],
				userId: userId,
			});
			if (error) {
				const errVal = error.value;
				// biome-ignore lint/suspicious/noExplicitAny: generic error handling
				const msg =
					typeof errVal === "string"
						? errVal
						: (errVal as any)?.message || "Failed to add role";
				throw new Error(msg);
			}
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] });
			// Clear selection if needed to force refresh from list
			if (selectedUser) {
				setRoleToAdd("");
			}
		},
	});

	const removeRoleMutation = useMutation({
		mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
			const { data, error } = await api.api.profile["remove_role"].patch({
				// biome-ignore lint/suspicious/noExplicitAny: casting for eden treaty strict typing
				permission: [role] as any,
				userId: userId,
			});
			if (error) {
				const errVal = error.value;
				// biome-ignore lint/suspicious/noExplicitAny: generic error handling
				const msg =
					typeof errVal === "string"
						? errVal
						: (errVal as any)?.message || "Failed to remove role";
				throw new Error(msg);
			}
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-users"] });
		},
	});

	if (!hasPermission(["manager", "admin"])) {
		return (
			<div className="container py-10">
				Access Denied. You do not have permission to view this page.
			</div>
		);
	}

	if (isLoading)
		return (
			<div className="container py-10 flex justify-center">
				<Loader2 className="animate-spin" />
			</div>
		);
	if (error)
		return (
			<div className="container py-10 text-destructive">
				{(error as Error).message}
			</div>
		);

	// Helper to get updated user data for the dialog from the fresh 'users' list
	const activeUser =
		users?.find((u) => u.id === selectedUser?.id) || selectedUser;

	return (
		<div className="container py-10 space-y-6">
			<div>
				<h1 className="text-3xl font-bold">User Management</h1>
				<p className="text-muted-foreground">
					Manage user roles and permissions.
				</p>
			</div>

			<div className="flex gap-4 items-end">
				<div className="space-y-2 flex-1">
					<Label>Search</Label>
					<div className="flex gap-2">
						<div className="w-[150px]">
							<Select
								value={searchType}
								onValueChange={(val: "username" | "userId") =>
									setSearchType(val)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="username">Username</SelectItem>
									<SelectItem value="userId">User ID</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex-1 relative">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder={`Search by ${searchType}...`}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-8"
							/>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{users?.map((user) => (
					<Card key={user.id}>
						<CardHeader className="pb-2">
							<div className="flex justify-between items-start">
								<div>
									<CardTitle>{user.username}</CardTitle>
									<CardDescription
										className="text-xs font-mono mt-1"
										title="User ID"
									>
										ID: {user.userId}
									</CardDescription>
								</div>
								<UserCog className="text-muted-foreground h-5 w-5" />
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-1 mt-2">
								{user.permission.map((perm: string) => (
									<Badge
										key={perm}
										variant={
											perm === "admin"
												? "destructive"
												: perm === "manager"
													? "default"
													: "secondary"
										}
									>
										{perm}
									</Badge>
								))}
							</div>
						</CardContent>
						<CardFooter>
							<Dialog
								open={selectedUser?.id === user.id}
								onOpenChange={(open) => setSelectedUser(open ? user : null)}
							>
								<DialogTrigger asChild>
									<Button variant="outline" className="w-full">
										Manage Roles
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>
											Manage Roles for {activeUser?.username}
										</DialogTitle>
										<DialogDescription>
											Add or remove permissions for this user.
										</DialogDescription>
									</DialogHeader>

									<div className="space-y-4 py-4">
										<div className="space-y-2">
											<Label>Current Roles</Label>
											<div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
												{activeUser?.permission.length === 0 && (
													<span className="text-muted-foreground text-sm italic">
														No roles assigned
													</span>
												)}
												{activeUser?.permission.map((perm: string) => (
													<Badge
														key={perm}
														variant={
															perm === "admin"
																? "destructive"
																: perm === "manager"
																	? "default"
																	: "secondary"
														}
														className="pr-1 gap-1"
													>
														{perm}
														<button
															type="button"
															className="rounded-full hover:bg-muted p-0.5 ml-1"
															onClick={() =>
																removeRoleMutation.mutate({
																	userId: activeUser.userId,
																	role: perm,
																})
															}
															disabled={removeRoleMutation.isPending}
														>
															<X className="h-3 w-3" />
														</button>
													</Badge>
												))}
											</div>
										</div>

										<div className="space-y-2">
											<Label>Add New Role</Label>
											<div className="flex gap-2">
												<Select value={roleToAdd} onValueChange={setRoleToAdd}>
													<SelectTrigger className="flex-1">
														<SelectValue placeholder="Select a role" />
													</SelectTrigger>
													<SelectContent>
														{availableRoles
															?.filter(
																(r: string) =>
																	!activeUser?.permission.includes(r),
															)
															.map((role: string) => (
																<SelectItem key={role} value={role}>
																	{role}
																</SelectItem>
															))}
													</SelectContent>
												</Select>
												<Button
													onClick={() => {
														if (roleToAdd) {
															activeUser &&
																addRoleMutation.mutate({
																	userId: activeUser.userId,
																	role: roleToAdd,
																});
														}
													}}
													disabled={!roleToAdd || addRoleMutation.isPending}
												>
													<Plus className="h-4 w-4 mr-2" /> Add
												</Button>
											</div>
										</div>
									</div>
									<DialogFooter>
										<Button
											variant="ghost"
											onClick={() => setSelectedUser(null)}
										>
											Close
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</CardFooter>
					</Card>
				))}
				{users?.length === 0 && (
					<div className="col-span-full text-center py-20 border-2 border-dashed rounded-lg">
						<p className="text-muted-foreground">No users found.</p>
					</div>
				)}
			</div>
		</div>
	);
}
