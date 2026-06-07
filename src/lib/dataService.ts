// Unified data service - supports both localStorage and Supabase (cloud)
// When Supabase is configured, data is stored in the cloud and shared across devices
// When Supabase is not configured, data is stored in localStorage with export/import support

import { isSupabaseConfigured, supabase } from './supabase';
import * as store from './store';

// ─── Auth ────────────────────────────────────────────────

export async function login(username: string, password: string) {
  if (isSupabaseConfigured()) {
    // Use Supabase custom auth (we store users in a table)
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    if (!data) throw new Error('用户名或密码错误');
    // Simple password comparison for now (in production, use bcrypt)
    if (data.password !== password) throw new Error('用户名或密码错误');
    if (data.status !== 'active') throw new Error('账号已停用');
    const session = {
      userId: data.id,
      username: data.username,
      name: data.name,
      role: data.role,
    };
    localStorage.setItem('bo_session', JSON.stringify(session));
    return session;
  }
  // Fallback to localStorage
  return store.login(username, password);
}

export async function me() {
  if (isSupabaseConfigured()) {
    const sessionStr = localStorage.getItem('bo_session');
    if (!sessionStr) return null;
    return JSON.parse(sessionStr);
  }
  return store.me();
}

export function logout() {
  localStorage.removeItem('bo_session');
  localStorage.removeItem('blueocean_token');
  store.logout();
}

// ─── Users ───────────────────────────────────────────────

export async function getUsers() {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('users').select('*').order('id');
    return data || [];
  }
  return store.getUsers();
}

export async function createUser(userData: { username: string; name: string; password: string; role: string; status: string }) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('users').insert([userData]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  return store.createUser(userData as any);
}

export async function updateUser(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
    return { id, ...updates };
  }
  return store.updateUser(id, updates);
}

export async function deleteUser(id: number) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  store.deleteUser(id);
  return true;
}

// ─── Projects ────────────────────────────────────────────

export async function getProjects() {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('projects').select('*').order('id');
    return data || [];
  }
  return store.getProjects();
}

export async function createProject(projectData: { name: string; description?: string; status?: string; createdBy?: number }) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('projects').insert([projectData]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  return store.createProject(projectData as any);
}

export async function updateProject(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('projects').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
    return { id, ...updates };
  }
  return store.updateProject(id, updates);
}

export async function deleteProject(id: number) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  store.deleteProject(id);
  return true;
}

// ─── Contract Templates ──────────────────────────────────

export async function getTemplates() {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('contract_templates').select('*').order('id');
    return data || [];
  }
  return store.getTemplates();
}

export async function createTemplate(templateData: { name: string; content: string; description?: string; createdBy?: number }) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('contract_templates').insert([templateData]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  return store.createTemplate(templateData as any, templateData.createdBy || 1);
}

export async function updateTemplate(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('contract_templates').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
    return { id, ...updates };
  }
  return store.updateTemplate(id, updates);
}

export async function deleteTemplate(id: number) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('contract_templates').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  store.deleteTemplate(id);
  return true;
}

// ─── Contracts ───────────────────────────────────────────

export async function getContracts() {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('contracts').select('*').order('id');
    return data || [];
  }
  return store.getContracts();
}

export async function getContractById(id: number) {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('contracts').select('*').eq('id', id).single();
    return data;
  }
  return store.getContractById(id);
}

export async function createContract(contractData: Record<string, unknown>, createdBy: number) {
  if (isSupabaseConfigured()) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: existing } = await supabase.from('contracts').select('contract_no').like('contract_no', `BH-${yearMonth}-%`).order('contract_no', { ascending: false }).limit(1);
    let seq = 1;
    if (existing && existing.length > 0) {
      const lastSeq = parseInt(existing[0].contract_no.split('-')[2]);
      seq = lastSeq + 1;
    }
    const contractNo = `BH-${yearMonth}-${String(seq).padStart(4, '0')}`;
    const { data, error } = await supabase.from('contracts').insert([{ ...contractData, contract_no: contractNo, created_by: createdBy }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  return store.createContract(contractData as any, createdBy);
}

export async function updateContract(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('contracts').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
    return { id, ...updates };
  }
  return store.updateContract(id, updates);
}

export async function deleteContract(id: number) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  store.deleteContract(id);
  return true;
}

// ─── Budgets ─────────────────────────────────────────────

export async function getBudgets() {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('project_budgets').select('*').order('id');
    return data || [];
  }
  return store.getBudgets();
}

export async function getBudgetById(id: number) {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('project_budgets').select('*').eq('id', id).single();
    return data;
  }
  return store.getBudgetById(id);
}

export async function createBudget(budgetData: Record<string, unknown>, createdBy: number) {
  if (isSupabaseConfigured()) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: existing } = await supabase.from('project_budgets').select('budget_no').like('budget_no', `YS-${yearMonth}-%`).order('budget_no', { ascending: false }).limit(1);
    let seq = 1;
    if (existing && existing.length > 0) {
      const lastSeq = parseInt(existing[0].budget_no.split('-')[2]);
      seq = lastSeq + 1;
    }
    const budgetNo = `YS-${yearMonth}-${String(seq).padStart(4, '0')}`;
    const { data, error } = await supabase.from('project_budgets').insert([{ ...budgetData, budget_no: budgetNo, created_by: createdBy }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  return store.createBudget(budgetData as any, createdBy);
}

export async function deleteBudget(id: number) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('project_budgets').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  store.deleteBudget(id);
  return true;
}

// ─── Quality Records ─────────────────────────────────────

export async function getQualityRecords() {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('quality_records').select('*').order('id');
    return data || [];
  }
  return store.getQualityRecords();
}

export async function createQualityRecord(recordData: Record<string, unknown>, createdBy: number) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('quality_records').insert([{ ...recordData, created_by: createdBy }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  return store.createQualityRecord(recordData as any, createdBy);
}

export async function updateQualityRecord(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('quality_records').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
    return { id, ...updates };
  }
  return store.updateQualityRecord(id, updates);
}

export async function deleteQualityRecord(id: number) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('quality_records').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  store.deleteQualityRecord(id);
  return true;
}

// ─── Idle Logs ───────────────────────────────────────────

export async function getIdleLogs() {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('idle_logs').select('*').order('id');
    return data || [];
  }
  return store.getIdleLogs();
}

export async function createIdleLog(logData: Record<string, unknown>, createdBy: number) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('idle_logs').insert([{ ...logData, created_by: createdBy }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  return store.createIdleLog(logData as any, createdBy);
}

export async function updateIdleLog(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('idle_logs').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
    return { id, ...updates };
  }
  return store.updateIdleLog(id, updates);
}

export async function deleteIdleLog(id: number) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('idle_logs').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  store.deleteIdleLog(id);
  return true;
}

// ─── Rework Ledgers ──────────────────────────────────────

export async function getReworkLedgers() {
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('rework_ledgers').select('*').order('id');
    return data || [];
  }
  return store.getReworkLedgers();
}

export async function createReworkLedger(ledgerData: Record<string, unknown>, createdBy: number) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('rework_ledgers').insert([{ ...ledgerData, created_by: createdBy }]).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
  return store.createReworkLedger(ledgerData as any, createdBy);
}

export async function updateReworkLedger(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('rework_ledgers').update(updates).eq('id', id);
    if (error) throw new Error(error.message);
    return { id, ...updates };
  }
  return store.updateReworkLedger(id, updates);
}

export async function deleteReworkLedger(id: number) {
  if (isSupabaseConfigured()) {
    const { error } = await supabase.from('rework_ledgers').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }
  store.deleteReworkLedger(id);
  return true;
}

// ─── Data Export/Import ──────────────────────────────────

export interface SystemData {
  users: any[];
  projects: any[];
  contract_templates: any[];
  contracts: any[];
  project_budgets: any[];
  quality_records: any[];
  idle_logs: any[];
  rework_ledgers: any[];
  exportedAt: string;
}

export function exportAllData(): SystemData {
  return {
    users: store.getUsers(),
    projects: store.getProjects(),
    contract_templates: store.getTemplates(),
    contracts: store.getContracts(),
    project_budgets: store.getBudgets(),
    quality_records: store.getQualityRecords(),
    idle_logs: store.getIdleLogs(),
    rework_ledgers: store.getReworkLedgers(),
    exportedAt: new Date().toISOString(),
  };
}

export function importAllData(data: SystemData) {
  if (data.users?.length) localStorage.setItem('bo_users', JSON.stringify(data.users));
  if (data.projects?.length) localStorage.setItem('bo_projects', JSON.stringify(data.projects));
  if (data.contract_templates?.length) localStorage.setItem('bo_templates', JSON.stringify(data.contract_templates));
  if (data.contracts?.length) localStorage.setItem('bo_contracts', JSON.stringify(data.contracts));
  if (data.project_budgets?.length) localStorage.setItem('bo_budgets', JSON.stringify(data.project_budgets));
  if (data.quality_records?.length) localStorage.setItem('bo_quality', JSON.stringify(data.quality_records));
  if (data.idle_logs?.length) localStorage.setItem('bo_idleLogs', JSON.stringify(data.idle_logs));
  if (data.rework_ledgers?.length) localStorage.setItem('bo_reworks', JSON.stringify(data.rework_ledgers));
}
