// Unified data access hook
// When Supabase is configured: uses Supabase (cloud data sharing)
// When Supabase is NOT configured: uses localStorage (local data storage)

import { useState, useEffect, useCallback, useRef } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import * as dataService from '@/lib/dataService';
import * as store from '@/lib/store';
import { trpc } from '@/providers/trpc';

// ─── Unified Auth ────────────────────────────────────────

export function useAuthService() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = dataService.me();
    setUser(session);
    setIsLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    if (isSupabaseConfigured()) {
      const result = await dataService.login(username, password);
      setUser(result);
      return result;
    }
    const result = store.login(username, password);
    setUser(result);
    return result;
  }, []);

  const logout = useCallback(() => {
    dataService.logout();
    setUser(null);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === 'super_admin',
    isContractAdmin: user?.role === 'super_admin' || user?.role === 'contract_admin',
    isProjectManager: user?.role === 'super_admin' || user?.role === 'project_manager',
    login,
    logout,
  };
}

// ─── Generic Data Hook ───────────────────────────────────

function useLocalData<T>(
  fetcher: () => T | Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshRef = useRef(0);

  const refresh = useCallback(() => {
    refreshRef.current += 1;
    setIsLoading(true);
    Promise.resolve(fetcher()).then((result) => {
      setData(result);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [fetcher]);

  useEffect(() => {
    refresh();
  }, [...deps, refreshRef.current]);

  return { data, isLoading, refresh };
}

// ─── Specific Data Hooks ─────────────────────────────────

export function useUsers() {
  const meQuery = trpc.localAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isSupabaseConfigured()) {
    return useLocalData(() => dataService.getUsers());
  }

  const { data, isLoading } = trpc.user.list.useQuery(
    undefined,
    { enabled: !!meQuery.data }
  );
  return { data: data || null, isLoading, refresh: () => {} };
}

export function useProjects() {
  if (isSupabaseConfigured()) {
    return useLocalData(() => dataService.getProjects());
  }

  const { data, isLoading } = trpc.project.list.useQuery();
  return { data: data || null, isLoading, refresh: () => {} };
}

export function useTemplates() {
  if (isSupabaseConfigured()) {
    return useLocalData(() => dataService.getTemplates());
  }

  const { data, isLoading } = trpc.contractTemplate.list.useQuery();
  return { data: data || null, isLoading, refresh: () => {} };
}

export function useContracts() {
  if (isSupabaseConfigured()) {
    return useLocalData(() => dataService.getContracts());
  }

  const { data, isLoading } = trpc.contract.list.useQuery();
  return { data: data || null, isLoading, refresh: () => {} };
}

export function useBudgets() {
  if (isSupabaseConfigured()) {
    return useLocalData(() => dataService.getBudgets());
  }

  const { data, isLoading } = trpc.budget.list.useQuery();
  return { data: data || null, isLoading, refresh: () => {} };
}

export function useQualityRecords() {
  if (isSupabaseConfigured()) {
    return useLocalData(() => dataService.getQualityRecords());
  }

  const { data, isLoading } = trpc.quality.list.useQuery();
  return { data: data || null, isLoading, refresh: () => {} };
}

export function useIdleLogs() {
  if (isSupabaseConfigured()) {
    return useLocalData(() => dataService.getIdleLogs());
  }

  const { data, isLoading } = trpc.idleLog.list.useQuery();
  return { data: data || null, isLoading, refresh: () => {} };
}

export function useReworkLedgers() {
  if (isSupabaseConfigured()) {
    return useLocalData(() => dataService.getReworkLedgers());
  }

  const { data, isLoading } = trpc.rework.list.useQuery();
  return { data: data || null, isLoading, refresh: () => {} };
}

// ─── Mutations ───────────────────────────────────────────

export async function mutateUser(action: 'create' | 'update' | 'delete', payload: any) {
  if (isSupabaseConfigured()) {
    if (action === 'create') return dataService.createUser(payload);
    if (action === 'update') return dataService.updateUser(payload.id, payload);
    if (action === 'delete') return dataService.deleteUser(payload);
    return null;
  }
  if (action === 'create') return store.createUser(payload);
  if (action === 'update') return store.updateUser(payload.id, payload);
  if (action === 'delete') return store.deleteUser(payload);
  return null;
}

export async function mutateProject(action: 'create' | 'update' | 'delete', payload: any) {
  if (isSupabaseConfigured()) {
    if (action === 'create') return dataService.createProject(payload);
    if (action === 'update') return dataService.updateProject(payload.id, payload);
    if (action === 'delete') return dataService.deleteProject(payload);
    return null;
  }
  if (action === 'create') return store.createProject(payload);
  if (action === 'update') return store.updateProject(payload.id, payload);
  if (action === 'delete') return store.deleteProject(payload);
  return null;
}

export async function mutateTemplate(action: 'create' | 'update' | 'delete', payload: any) {
  if (isSupabaseConfigured()) {
    if (action === 'create') return dataService.createTemplate(payload);
    if (action === 'update') return dataService.updateTemplate(payload.id, payload);
    if (action === 'delete') return dataService.deleteTemplate(payload);
    return null;
  }
  if (action === 'create') return store.createTemplate(payload, payload.createdBy || 1);
  if (action === 'update') return store.updateTemplate(payload.id, payload);
  if (action === 'delete') return store.deleteTemplate(payload);
  return null;
}

export async function mutateContract(action: 'create' | 'update' | 'delete', payload: any, createdBy?: number) {
  if (isSupabaseConfigured()) {
    if (action === 'create') return dataService.createContract(payload, createdBy || 1);
    if (action === 'update') return dataService.updateContract(payload.id, payload);
    if (action === 'delete') return dataService.deleteContract(payload);
    return null;
  }
  if (action === 'create') return store.createContract(payload, createdBy || 1);
  if (action === 'update') return store.updateContract(payload.id, payload);
  if (action === 'delete') return store.deleteContract(payload);
  return null;
}

export async function mutateBudget(action: 'create' | 'delete', payload: any, createdBy?: number) {
  if (isSupabaseConfigured()) {
    if (action === 'create') return dataService.createBudget(payload, createdBy || 1);
    if (action === 'delete') return dataService.deleteBudget(payload);
    return null;
  }
  if (action === 'create') return store.createBudget(payload, createdBy || 1);
  if (action === 'delete') return store.deleteBudget(payload);
  return null;
}

export async function mutateQualityRecord(action: 'create' | 'update' | 'delete', payload: any, createdBy?: number) {
  if (isSupabaseConfigured()) {
    if (action === 'create') return dataService.createQualityRecord(payload, createdBy || 1);
    if (action === 'update') return dataService.updateQualityRecord(payload.id, payload);
    if (action === 'delete') return dataService.deleteQualityRecord(payload);
    return null;
  }
  if (action === 'create') return store.createQualityRecord(payload, createdBy || 1);
  if (action === 'update') return store.updateQualityRecord(payload.id, payload);
  if (action === 'delete') return store.deleteQualityRecord(payload);
  return null;
}

export async function mutateIdleLog(action: 'create' | 'update' | 'delete', payload: any, createdBy?: number) {
  if (isSupabaseConfigured()) {
    if (action === 'create') return dataService.createIdleLog(payload, createdBy || 1);
    if (action === 'update') return dataService.updateIdleLog(payload.id, payload);
    if (action === 'delete') return dataService.deleteIdleLog(payload);
    return null;
  }
  if (action === 'create') return store.createIdleLog(payload, createdBy || 1);
  if (action === 'update') return store.updateIdleLog(payload.id, payload);
  if (action === 'delete') return store.deleteIdleLog(payload);
  return null;
}

export async function mutateReworkLedger(action: 'create' | 'update' | 'delete', payload: any, createdBy?: number) {
  if (isSupabaseConfigured()) {
    if (action === 'create') return dataService.createReworkLedger(payload, createdBy || 1);
    if (action === 'update') return dataService.updateReworkLedger(payload.id, payload);
    if (action === 'delete') return dataService.deleteReworkLedger(payload);
    return null;
  }
  if (action === 'create') return store.createReworkLedger(payload, createdBy || 1);
  if (action === 'update') return store.updateReworkLedger(payload.id, payload);
  if (action === 'delete') return store.deleteReworkLedger(payload);
  return null;
}
