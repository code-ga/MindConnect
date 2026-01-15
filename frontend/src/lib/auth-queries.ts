import { authClient } from "./auth";
import { api } from "./api";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { redirect, type ParsedLocation } from "@tanstack/react-router";

export const authQueries = {
	session: () =>
		queryOptions({
			queryKey: ["session"],
			queryFn: async () => {
				const { data, error } = await authClient.getSession();
				if (error) throw error;
				return data;
			},
			staleTime: 1000 * 60 * 5, // 5 minutes
		}),
	profile: () =>
		queryOptions({
			queryKey: ["profile"],
			queryFn: async () => {
				const { data, error } = await api.api.profile.me.get();
				if (error) {
					if (error.status === 404) return null;
					throw error;
				}
				return data?.success ? data.data : null;
			},
			staleTime: 1000 * 60 * 10, // 10 minutes
		}),
};

/**
 * Helper to require authentication in TanStack Router routes
 */
export const requireAuth = async ({
	context,
	location,
}: {
	context: { queryClient: QueryClient };
	location: ParsedLocation;
}) => {
	const session = await context.queryClient.fetchQuery(authQueries.session());
	if (!session) {
		throw redirect({
			to: "/login",
			search: {
				redirect: location.href,
			},
		});
	}
	return session;
};
