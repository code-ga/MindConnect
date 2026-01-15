import type React from "react";
import { useAuth } from "./auth-context";
import type { Permission } from "./auth-context";

interface RoleGuardProps {
	children: React.ReactNode;
	requiredPermissions: Permission[];
	fallback?: React.ReactNode;
}

export function RoleGuard({ children, requiredPermissions, fallback = null }: RoleGuardProps) {
	const { hasPermission, loading } = useAuth();

	if (loading) return null;

	if (!hasPermission(requiredPermissions)) {
		return <>{fallback}</>;
	}

	return <>{children}</>;
}
