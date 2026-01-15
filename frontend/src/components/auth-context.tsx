import type React from "react";
import { createContext, useContext, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authQueries } from "@/lib/auth-queries";
import { authClient } from "@/lib/auth";

export type Permission = 
  | "user"
  | "listener"
  | "psychologist"
  | "therapist"
  | "manager"
  | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Profile {
  id: string;
  userId: string;
  username: string;
  permission: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  session: any;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  hasPermission: (permissions: Permission[]) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  
  const { 
    data: session, 
    isLoading: authLoading, 
    error: authError 
  } = useQuery(authQueries.session());

  const { 
    data: profileData, 
    isLoading: profileLoading, 
    error: profileError 
  } = useQuery({
    ...authQueries.profile(),
    enabled: !!session?.user,
  });

  const profile = profileData as unknown as Profile | null;

  const refreshProfile = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  }, [queryClient]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    queryClient.setQueryData(["session"], null);
    queryClient.setQueryData(["profile"], null);
  }, [queryClient]);

  const hasPermission = useCallback((requiredPermissions: Permission[]) => {
    if (!profile) return false;
    return requiredPermissions.some(p => profile.permission.includes(p));
  }, [profile]);

  const value = useMemo(() => ({
    session,
    user: session?.user as User | null,
    profile,
    loading: authLoading || profileLoading,
    error: (authError?.message || profileError?.message) || null,
    refreshProfile,
    hasPermission,
    signOut,
  }), [session, authLoading, profile, profileLoading, authError, profileError, refreshProfile, hasPermission, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
