import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/providers/trpc";

export type AuthUser = {
  id: number;
  username: string;
  name: string;
  role: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const meQuery = trpc.localAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (meQuery.isLoading) {
      setIsLoading(true);
    } else if (meQuery.data) {
      setUser(meQuery.data as AuthUser);
      setIsLoading(false);
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [meQuery.data, meQuery.isLoading]);

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("blueocean_token", data.token);
      setUser(data.user as AuthUser);
    },
  });

  const logoutMutation = trpc.localAuth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("blueocean_token");
      setUser(null);
      window.location.reload();
    },
    onError: () => {
      // Even if server logout fails, clear local state
      localStorage.removeItem("blueocean_token");
      setUser(null);
      window.location.reload();
    },
  });

  const login = useCallback(
    (username: string, password: string) => {
      return loginMutation.mutateAsync({ username, password });
    },
    [loginMutation]
  );

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  const isAuthenticated = !!user;
  const isSuperAdmin = user?.role === "super_admin";
  const isContractAdmin = user?.role === "contract_admin" || isSuperAdmin;
  const isProjectManager = user?.role === "project_manager" || isSuperAdmin;

  return useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      isSuperAdmin,
      isContractAdmin,
      isProjectManager,
      login,
      logout,
    }),
    [user, isAuthenticated, isLoading, isSuperAdmin, isContractAdmin, isProjectManager, login, logout]
  );
}
