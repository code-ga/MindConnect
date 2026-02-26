import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import Header from "../components/Header";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { ThemeProvider } from "../components/theme-provider";
import { AuthProvider, useAuth } from "../components/auth-context";
import { useEffect, useCallback } from "react";

interface MyRouterContext {
	queryClient: QueryClient;
}

const AppContent = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, profile, loading } = useAuth();

	// Define public routes that don't require authentication
	const publicRoutes = ["/login"];
	const isPublicRoute = publicRoutes.includes(location.pathname);
	const isLoginPage = location.pathname === "/login";
	const isProfileCreatePage = location.pathname === "/profile/create";

	// Middleware: Handle auth redirects
	const handleAuthRedirects = useCallback(() => {
		// Skip redirect logic while loading
		if (loading) return;

		// If not authenticated and not on a public route, redirect to login
		if (!user && !isPublicRoute && !isProfileCreatePage) {
			navigate({ to: "/login" });
			return;
		}

		// If authenticated but no profile, redirect to profile creation (unless already there)
		if (user && !profile && !isProfileCreatePage && !isLoginPage) {
			navigate({ to: "/profile/create" });
			return;
		}
	}, [user, profile, loading, isPublicRoute, isProfileCreatePage, isLoginPage, navigate]);

	// Run auth redirects effect
	useEffect(() => {
		handleAuthRedirects();
	}, [handleAuthRedirects]);

	return (
		<ThemeProvider defaultTheme="dark" storageKey="mindconnect-theme">
			{!isLoginPage && <Header />}
			<Outlet />
			<TanStackDevtools
				config={{
					position: "bottom-right",
				}}
				plugins={[
					{
						name: "Tanstack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
					TanStackQueryDevtools,
				]}
			/>
		</ThemeProvider>
	);
};

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: () => (
		<AuthProvider>
			<AppContent />
		</AuthProvider>
	),
});
