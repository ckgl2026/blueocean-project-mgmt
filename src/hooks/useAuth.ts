import { useState, useEffect, useCallback, useMemo } from "react";
import { me, logout as doLogout } from "@/lib/dataService";

export type AuthUser = {
  id: number;
  username: string;
  name: string;
  role: string;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = me();
    setUser(session ? { id: session.userId, username: session.username, name: session.name, role: session.role } : null);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    doLogout();
    setUser(null);
    window.location.reload();
  }, []);

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
      logout,
    }),
    [user, isAuthenticated, isLoading, isSuperAdmin, isContractAdmin, isProjectManager, logout]
  );
}
