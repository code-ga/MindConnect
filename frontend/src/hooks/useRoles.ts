import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/error-utils";

export interface Role {
	id: string;
	name: string;
	description: string | null;
	scope: string;
	isMatchable: boolean;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
	permissions: { id: string; resource: string; action: string }[];
}

interface RoleFilters {
	scope?: "system" | "chatroom";
	isMatchable?: boolean;
}

export function useRoles(filters?: RoleFilters) {
	return useQuery({
		queryKey: ["roles", filters],
		queryFn: async () => {
			const query: Record<string, string> = {};
			if (filters?.scope) query.scope = filters.scope;
			if (filters?.isMatchable !== undefined)
				query.isMatchable = String(filters.isMatchable);

			const { data, error } = await api.api.role.get({ query });
			if (error) throw new Error(getErrorMessage(error));
			return (data?.data ?? []) as Role[];
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

export function useMatchableRoles() {
	return useRoles({ isMatchable: true });
}
