import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "./auth-context";

export interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireProfile?: boolean;
  requiredPermissions?: string[];
  fallback?: ReactNode;
  redirectTo?: string;
  onUnauthorized?: () => void;
}

/**
 * Protected Route Component
 * Wraps routes to enforce authentication and authorization checks
 */
export function ProtectedRoute({
  children,
  requireAuth = false,
  requireProfile = false,
  requiredPermissions = [],
  fallback,
  redirectTo = "/login",
  onUnauthorized,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Skip checks while loading
    if (loading) {
      setIsAuthorized(null);
      return;
    }

    // Check authentication
    if (requireAuth && !user) {
      onUnauthorized?.();
      navigate({ to: redirectTo });
      setIsAuthorized(false);
      return;
    }

    // Check profile
    if (requireProfile && user && !profile) {
      navigate({ to: "/profile/create" });
      setIsAuthorized(false);
      return;
    }

    // Check permissions
    if (requiredPermissions.length > 0 && profile) {
      const hasPermission = requiredPermissions.some((permission) =>
        profile.permission.includes(permission as any)
      );

      if (!hasPermission) {
        onUnauthorized?.();
        navigate({ to: "/unauthorized" });
        setIsAuthorized(false);
        return;
      }
    }

    // All checks passed
    setIsAuthorized(true);
  }, [loading, user, profile, requireAuth, requireProfile, requiredPermissions, redirectTo, navigate, onUnauthorized]);

  // Show loading state
  if (isAuthorized === null && loading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authorized
  if (isAuthorized === false) {
    return fallback || null;
  }

  // Authorized - render children
  return <>{children}</>;
}

/**
 * Hook wrapper for checking auth in a component
 */
export function useProtectedRoute(config: Omit<ProtectedRouteProps, "children" | "fallback">) {
  const { user, profile, loading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    let authorized = true;

    if (config.requireAuth && !user) {
      authorized = false;
    }

    if (config.requireProfile && user && !profile) {
      authorized = false;
    }

    if (config.requiredPermissions && config.requiredPermissions.length > 0 && profile) {
      const hasPermission = config.requiredPermissions.some((permission) =>
        profile.permission.includes(permission as any)
      );
      authorized = hasPermission;
    }

    setIsAuthorized(authorized);
  }, [loading, user, profile, config.requireAuth, config.requireProfile, config.requiredPermissions]);

  return {
    isAuthorized,
    isLoading: loading,
    user,
    profile,
  };
}
