import { useAuth } from "@/components/auth-context";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export interface RouteAuthConfig {
  requireAuth?: boolean;
  requireProfile?: boolean;
  requiredPermissions?: string[];
  redirectTo?: string;
}

/**
 * Hook to protect routes that require authentication
 * Usage in route beforeLoad:
 * beforeLoad: async ({ navigate }) => {
 *   await useAuthRoute({ requireAuth: true, requireProfile: true });
 * }
 */
export function useAuthRoute(config: RouteAuthConfig = {}) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const {
    requireAuth = false,
    requireProfile = false,
    requiredPermissions = [],
    redirectTo = "/login",
  } = config;

  useEffect(() => {
    // Skip check while loading
    if (loading) return;

    // Check if auth is required but user is not logged in
    if (requireAuth && !user) {
      navigate({ to: redirectTo });
      return;
    }

    // Check if profile is required but doesn't exist
    if (requireProfile && user && !profile) {
      navigate({ to: "/profile/create" });
      return;
    }

    // Check if specific permissions are required
    if (requiredPermissions.length > 0 && profile) {
      const hasPermission = requiredPermissions.some((permission) =>
        profile.permission.includes(permission as any)
      );

      if (!hasPermission) {
        navigate({ to: "/unauthorized" });
        return;
      }
    }
  }, [loading, user, profile, requireAuth, requireProfile, requiredPermissions, redirectTo, navigate]);

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    hasProfile: !!profile,
  };
}

/**
 * Helper function to create route beforeLoad guards
 * Usage in route:
 * beforeLoad: createAuthGuard({ requireAuth: true, requireProfile: true })
 */
export function createAuthGuard() {
  // Note: beforeLoad doesn't have access to context
  // Use ProtectedRoute component wrapper or useAuthRoute hook instead for actual auth checks
  return async () => {
    // Placeholder for route-level auth guard
    // Actual validation should happen in component via ProtectedRoute or useAuthRoute
  };
}
