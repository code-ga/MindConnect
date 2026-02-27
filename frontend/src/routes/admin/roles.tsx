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
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useState } from "react";
import { Plus, Trash2, Shield, Loader2, X } from "lucide-react";
import type { Role } from "@/hooks/useRoles";

export const Route = createFileRoute("/admin/roles")({
	component: AdminRolesPage,
});

function AdminRolesPage() {
	return (
		<ProtectedRoute
			requireAuth={true}
			requireProfile={true}
			requiredPermissions={["admin"]}
		>
			<AdminRoles />
		</ProtectedRoute>
	);
}

function AdminRoles() {
	const queryClient = useQueryClient();
	const [newRoleOpen, setNewRoleOpen] = useState(false);
	const [addPermOpen, setAddPermOpen] = useState<string | null>(null);
	const [newRole, setNewRole] = useState({
		name: "",
		description: "",
		scope: "system",
		isMatchable: false,
		isDefault: false,
	});
	const [newPerm, setNewPerm] = useState({ resource: "", action: "" });

	const { data: roles = [], isLoading } = useQuery({
		queryKey: ["roles"],
		queryFn: async () => {
			const { data, error } = await api.api.role.get();
			if (error) throw new Error("Failed to fetch roles");
			return (data?.data ?? []) as Role[];
		},
	});

	const createRoleMutation = useMutation({
		mutationFn: async () => {
			const { data, error } = await api.api.role.post({
				name: newRole.name,
				description: newRole.description || undefined,
				scope: newRole.scope,
				isMatchable: newRole.isMatchable,
				isDefault: newRole.isDefault,
			});
			if (error) throw new Error("Failed to create role");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			setNewRoleOpen(false);
			setNewRole({
				name: "",
				description: "",
				scope: "system",
				isMatchable: false,
				isDefault: false,
			});
		},
	});

	const deleteRoleMutation = useMutation({
		mutationFn: async (id: string) => {
			// biome-ignore lint/suspicious/noExplicitAny: Eden treaty dynamic path
			const { data, error } = await (api.api.role as any)({ id }).delete();
			if (error) throw new Error("Failed to delete role");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
		},
	});

	const toggleMatchableMutation = useMutation({
		mutationFn: async ({
			id,
			isMatchable,
		}: {
			id: string;
			isMatchable: boolean;
		}) => {
			// biome-ignore lint/suspicious/noExplicitAny: Eden treaty dynamic path
			const { data, error } = await (api.api.role as any)({ id }).put({
				isMatchable,
			});
			if (error) throw new Error("Failed to update role");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
		},
	});

	const addPermMutation = useMutation({
		mutationFn: async ({
			roleId,
			resource,
			action,
		}: {
			roleId: string;
			resource: string;
			action: string;
		}) => {
			// biome-ignore lint/suspicious/noExplicitAny: Eden treaty dynamic path
			const { data, error } = await (api.api.role as any)({
				id: roleId,
			}).permissions.post({ resource, action });
			if (error) throw new Error("Failed to add permission");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
			setAddPermOpen(null);
			setNewPerm({ resource: "", action: "" });
		},
	});

	const deletePermMutation = useMutation({
		mutationFn: async ({
			roleId,
			permId,
		}: {
			roleId: string;
			permId: string;
		}) => {
			// biome-ignore lint/suspicious/noExplicitAny: Eden treaty dynamic path
			const { data, error } = await (api.api.role as any)({
				id: roleId,
			})
				.permissions({ permId })
				.delete();
			if (error) throw new Error("Failed to remove permission");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["roles"] });
		},
	});

	if (isLoading) {
		return (
			<div className="container py-10 flex justify-center">
				<Loader2 className="animate-spin" />
			</div>
		);
	}

	return (
		<div className="container py-10 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Role Management</h1>
					<p className="text-muted-foreground">
						Create and manage system roles and their permissions.
					</p>
				</div>

				<Dialog open={newRoleOpen} onOpenChange={setNewRoleOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							New Role
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create New Role</DialogTitle>
							<DialogDescription>Add a new role to the system.</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label>Name</Label>
								<Input
									placeholder="e.g. counselor"
									value={newRole.name}
									onChange={(e) =>
										setNewRole((p) => ({ ...p, name: e.target.value }))
									}
								/>
							</div>
							<div className="space-y-2">
								<Label>Description</Label>
								<Input
									placeholder="Optional description"
									value={newRole.description}
									onChange={(e) =>
										setNewRole((p) => ({ ...p, description: e.target.value }))
									}
								/>
							</div>
							<div className="flex items-center justify-between">
								<Label>Matchable (appears in matching system)</Label>
								<Switch
									checked={newRole.isMatchable}
									onCheckedChange={(v) =>
										setNewRole((p) => ({ ...p, isMatchable: v }))
									}
								/>
							</div>
							<div className="flex items-center justify-between">
								<Label>Default (auto-assigned on registration)</Label>
								<Switch
									checked={newRole.isDefault}
									onCheckedChange={(v) =>
										setNewRole((p) => ({ ...p, isDefault: v }))
									}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="ghost" onClick={() => setNewRoleOpen(false)}>
								Cancel
							</Button>
							<Button
								onClick={() => createRoleMutation.mutate()}
								disabled={!newRole.name || createRoleMutation.isPending}
							>
								{createRoleMutation.isPending ? "Creating..." : "Create Role"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<div className="grid gap-4">
				{roles.length === 0 && (
					<div className="text-center py-20 border-2 border-dashed rounded-lg">
						<Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
						<p className="text-muted-foreground">
							No roles yet. Create your first role to get started.
						</p>
					</div>
				)}

				{roles.map((role) => (
					<Card key={role.id}>
						<CardHeader className="pb-3">
							<div className="flex items-start justify-between">
								<div className="space-y-1">
									<CardTitle className="capitalize flex items-center gap-2">
										{role.name}
										<Badge variant="outline" className="text-xs font-normal">
											{role.scope}
										</Badge>
										{role.isMatchable && (
											<Badge variant="secondary" className="text-xs">
												Matchable
											</Badge>
										)}
										{role.isDefault && (
											<Badge className="text-xs">Default</Badge>
										)}
									</CardTitle>
									{role.description && (
										<CardDescription>{role.description}</CardDescription>
									)}
								</div>
								<div className="flex items-center gap-3">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<span>Matchable</span>
										<Switch
											checked={role.isMatchable}
											onCheckedChange={(v) =>
												toggleMatchableMutation.mutate({
													id: role.id,
													isMatchable: v,
												})
											}
											disabled={toggleMatchableMutation.isPending}
										/>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="text-destructive hover:text-destructive"
										onClick={() => deleteRoleMutation.mutate(role.id)}
										disabled={deleteRoleMutation.isPending}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-3">
							<div>
								<p className="text-sm font-medium mb-2">Permissions</p>
								<div className="flex flex-wrap gap-2">
									{role.permissions.length === 0 && (
										<span className="text-xs text-muted-foreground italic">
											No resource permissions
										</span>
									)}
									{role.permissions.map((perm) => (
										<Badge
											key={perm.id}
											variant="secondary"
											className="gap-1 pr-1"
										>
											{perm.resource}:{perm.action}
											<button
												type="button"
												className="rounded-full hover:bg-muted p-0.5"
												onClick={() =>
													deletePermMutation.mutate({
														roleId: role.id,
														permId: perm.id,
													})
												}
											>
												<X className="h-3 w-3" />
											</button>
										</Badge>
									))}
								</div>
							</div>

							<Dialog
								open={addPermOpen === role.id}
								onOpenChange={(open) => {
									setAddPermOpen(open ? role.id : null);
									if (!open) setNewPerm({ resource: "", action: "" });
								}}
							>
								<DialogTrigger asChild>
									<Button variant="outline" size="sm">
										<Plus className="h-3 w-3 mr-1" />
										Add Permission
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>
											Add Permission to{" "}
											<span className="capitalize">{role.name}</span>
										</DialogTitle>
										<DialogDescription>
											Define a resource and action for this role.
										</DialogDescription>
									</DialogHeader>
									<div className="grid grid-cols-2 gap-4 py-4">
										<div className="space-y-2">
											<Label>Resource</Label>
											<Input
												placeholder="e.g. user-request"
												value={newPerm.resource}
												onChange={(e) =>
													setNewPerm((p) => ({
														...p,
														resource: e.target.value,
													}))
												}
											/>
										</div>
										<div className="space-y-2">
											<Label>Action</Label>
											<Input
												placeholder="e.g. read, write, admin"
												value={newPerm.action}
												onChange={(e) =>
													setNewPerm((p) => ({
														...p,
														action: e.target.value,
													}))
												}
											/>
										</div>
									</div>
									<DialogFooter>
										<Button
											variant="ghost"
											onClick={() => setAddPermOpen(null)}
										>
											Cancel
										</Button>
										<Button
											onClick={() =>
												addPermMutation.mutate({
													roleId: role.id,
													resource: newPerm.resource,
													action: newPerm.action,
												})
											}
											disabled={
												!newPerm.resource ||
												!newPerm.action ||
												addPermMutation.isPending
											}
										>
											{addPermMutation.isPending ? "Adding..." : "Add"}
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
