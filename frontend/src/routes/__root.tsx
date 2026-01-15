import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import Header from "../components/Header";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { ThemeProvider } from "../components/theme-provider";
import { AuthProvider, useAuth } from "../components/auth-context";
import { useEffect } from "react";

interface MyRouterContext {
	queryClient: QueryClient;
}

const AppContent = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, profile, loading } = useAuth();
	const isLoginPage = location.pathname === "/login";
	const isProfileCreatePage = location.pathname === "/profile/create";

	useEffect(() => {
		if (!loading && user && !profile && !isProfileCreatePage) {
			navigate({ to: "/profile/create" });
		}
	}, [user, profile, loading, isProfileCreatePage, navigate]);

	return (
		<ThemeProvider defaultTheme="dark" storageKey="k8s-dashboard-theme">
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
