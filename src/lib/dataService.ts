// Unified data service - uses Supabase when configured, falls back to localStorage
import { isSupabaseConfigured, supabase } from './supabase';
import * as store from './store';

// ─── Auth ────────────────────────────────────────────────

export async function login(username: string, password: string) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    if (error || !data) throw new Error('用户名或密码错误');
    // Compare password hash
    const inputHash = store.simpleHash(password);
    if (data.password !== inputHash) throw new Error('用户名或密码错误');
    if (data.status !== 'active') throw new Error('账号已停用');
    const session = { userId: data.id, username: data.username, name: data.name, role: data.role };
    localStorage.setItem('bo_session', JSON.stringify(session));
    return { token: 'token-' + Date.now(), user: { id: data.id, username: data.username, name: data.name, role: data.role } };
  }
  const result = store.login(username, password);
  return { token: 'token-' + Date.now(), user: { id: result.userId, username: result.username, name: result.name, role: result.role } };
}

export function me() {
  const sessionStr = localStorage.getItem('bo_session');
  if (!sessionStr) return null;
  try { return JSON.parse(sessionStr); } catch { return null; }
}

export function logout() {
  localStorage.removeItem('bo_session');
  localStorage.removeItem('blueocean_token');
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const session = me();
  if (!session) throw new Error('未登录');
  if (isSupabaseConfigured()) {
    const { data } = await supabase.from('users').select('*').eq('id', session.userId).single();
    if (!data) throw new Error('用户不存在');
    if (data.password !== store.simpleHash(oldPassword)) throw new Error('原密码错误');
    await supabase.from('users').update({ password: store.simpleHash(newPassword) }).eq('id', session.userId);
    return { success: true };
  }
  const users = store.getUsers();
  const user = users.find((u: any) => u.id === session.userId);
  if (!user) throw new Error('用户不存在');
  if (user.password !== store.simpleHash(oldPassword)) throw new Error('原密码错误');
  store.updateUser(user.id, { password: store.simpleHash(newPassword) });
  return { success: true };
}

// ─── Generic CRUD helpers ────────────────────────────────

async function sbList(table: string, searchColumn?: string, search?: string) {
  let query = supabase.from(table).select('*').order('id');
  if (searchColumn && search) {
    query = query.ilike(searchColumn, `%${search}%`);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function sbCreate(table: string, values: Record<string, unknown>) {
  const { data, error } = await supabase.from(table).insert(values).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function sbUpdate(table: string, id: number, values: Record<string, unknown>) {
  const { error } = await supabase.from(table).update(values).eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

async function sbDelete(table: string, id: number) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
  return { success: true };
}

// ─── Users ───────────────────────────────────────────────

export async function getUsers(_search?: string) {
  if (isSupabaseConfigured()) return sbList('users', undefined, undefined);
  return store.getUsers();
}

export async function createUser(userData: { username: string; name: string; password: string; role: "super_admin" | "contract_admin" | "project_manager"; status: "active" | "inactive" }) {
  if (isSupabaseConfigured()) {
    const pw = userData.password || ' ';
    return sbCreate('users', { ...userData, password: store.simpleHash(pw) });
  }
  return store.createUser(userData);
}

export async function updateUser(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) {
    if (updates.password) updates.password = store.simpleHash(updates.password as string);
    return sbUpdate('users', id, updates);
  }
  return store.updateUser(id, updates);
}

export async function deleteUser(id: number) {
  if (isSupabaseConfigured()) return sbDelete('users', id);
  store.deleteUser(id);
  return { success: true };
}

// ─── Projects ────────────────────────────────────────────

export async function getProjects(search?: string) {
  if (isSupabaseConfigured()) return sbList('projects', search ? 'name' : undefined, search);
  return store.getProjects();
}

export async function createProject(projectData: { name: string; description?: string; status?: string; createdBy?: number }) {
  if (isSupabaseConfigured()) return sbCreate('projects', projectData);
  return store.createProject(projectData as any);
}

export async function updateProject(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) return sbUpdate('projects', id, updates);
  return store.updateProject(id, updates);
}

export async function deleteProject(id: number) {
  if (isSupabaseConfigured()) return sbDelete('projects', id);
  store.deleteProject(id);
  return { success: true };
}

// ─── Contract Templates ──────────────────────────────────

export async function getTemplates(search?: string) {
  if (isSupabaseConfigured()) return sbList('contract_templates', search ? 'name' : undefined, search);
  return store.getTemplates();
}

export async function createTemplate(templateData: { name: string; content: string; description?: string; createdBy?: number }) {
  if (isSupabaseConfigured()) return sbCreate('contract_templates', templateData);
  return store.createTemplate(templateData as any, templateData.createdBy || 1);
}

export async function updateTemplate(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) return sbUpdate('contract_templates', id, updates);
  return store.updateTemplate(id, updates);
}

export async function deleteTemplate(id: number) {
  if (isSupabaseConfigured()) return sbDelete('contract_templates', id);
  store.deleteTemplate(id);
  return { success: true };
}

// ─── Contracts ───────────────────────────────────────────

export async function getContracts(search?: string, status?: string) {
  if (isSupabaseConfigured()) {
    let query = supabase.from('contracts').select('*').order('id');
    if (search) query = query.ilike('contract_no', `%${search}%`);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }
  return store.getContracts();
}

export async function getContractById(id: number) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('contracts').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    return data;
  }
  return store.getContractById(id);
}

export async function createContract(contractData: Record<string, unknown>, createdBy: number) {
  if (isSupabaseConfigured()) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: existing } = await supabase.from('contracts').select('contract_no').ilike('contract_no', `BH-${yearMonth}-%`).order('contract_no', { ascending: false }).limit(1);
    let seq = 1;
    if (existing && existing.length > 0) {
      const lastSeq = parseInt(existing[0].contract_no.split('-')[2]);
      seq = lastSeq + 1;
    }
    const contractNo = `BH-${yearMonth}-${String(seq).padStart(4, '0')}`;
    return sbCreate('contracts', { ...contractData, contract_no: contractNo, created_by: createdBy });
  }
  return store.createContract(contractData as any, createdBy);
}

export async function updateContract(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) return sbUpdate('contracts', id, updates);
  return store.updateContract(id, updates);
}

export async function deleteContract(id: number) {
  if (isSupabaseConfigured()) return sbDelete('contracts', id);
  store.deleteContract(id);
  return { success: true };
}

// ─── Budgets ─────────────────────────────────────────────

export async function getBudgets(search?: string) {
  if (isSupabaseConfigured()) return sbList('project_budgets', search ? 'project_name' : undefined, search);
  return store.getBudgets();
}

export async function getBudgetById(id: number) {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.from('project_budgets').select('*').eq('id', id).single();
    if (error) throw new Error(error.message);
    let contract = null;
    if (data.contract_id) {
      const { data: c } = await supabase.from('contracts').select('*').eq('id', data.contract_id).single();
      contract = c;
    }
    return { ...data, contract };
  }
  return store.getBudgetById(id);
}

export async function createBudget(budgetData: Record<string, unknown>, createdBy: number) {
  if (isSupabaseConfigured()) {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { data: existing } = await supabase.from('project_budgets').select('budget_no').ilike('budget_no', `YS-${yearMonth}-%`).order('budget_no', { ascending: false }).limit(1);
    let seq = 1;
    if (existing && existing.length > 0) {
      const lastSeq = parseInt(existing[0].budget_no.split('-')[2]);
      seq = lastSeq + 1;
    }
    const budgetNo = `YS-${yearMonth}-${String(seq).padStart(4, '0')}`;
    return sbCreate('project_budgets', { ...budgetData, budget_no: budgetNo, created_by: createdBy });
  }
  return store.createBudget(budgetData as any, createdBy);
}

export async function deleteBudget(id: number) {
  if (isSupabaseConfigured()) return sbDelete('project_budgets', id);
  store.deleteBudget(id);
  return { success: true };
}

// ─── Quality Records ─────────────────────────────────────

export async function getQualityRecords(search?: string) {
  if (isSupabaseConfigured()) return sbList('quality_records', search ? 'project_name' : undefined, search);
  return store.getQualityRecords();
}

export async function createQualityRecord(recordData: Record<string, unknown>, createdBy: number) {
  if (isSupabaseConfigured()) return sbCreate('quality_records', { ...recordData, created_by: createdBy });
  return store.createQualityRecord(recordData as any, createdBy);
}

export async function updateQualityRecord(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) return sbUpdate('quality_records', id, updates);
  return store.updateQualityRecord(id, updates);
}

export async function deleteQualityRecord(id: number) {
  if (isSupabaseConfigured()) return sbDelete('quality_records', id);
  store.deleteQualityRecord(id);
  return { success: true };
}

// ─── Idle Logs ───────────────────────────────────────────

export async function getIdleLogs(search?: string) {
  if (isSupabaseConfigured()) return sbList('idle_logs', search ? 'project_name' : undefined, search);
  return store.getIdleLogs();
}

export async function createIdleLog(logData: Record<string, unknown>, createdBy: number) {
  if (isSupabaseConfigured()) return sbCreate('idle_logs', { ...logData, created_by: createdBy });
  return store.createIdleLog(logData as any, createdBy);
}

export async function updateIdleLog(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) return sbUpdate('idle_logs', id, updates);
  return store.updateIdleLog(id, updates);
}

export async function deleteIdleLog(id: number) {
  if (isSupabaseConfigured()) return sbDelete('idle_logs', id);
  store.deleteIdleLog(id);
  return { success: true };
}

// ─── Rework Ledgers ──────────────────────────────────────

export async function getReworkLedgers(search?: string) {
  if (isSupabaseConfigured()) return sbList('rework_ledgers', search ? 'project_name' : undefined, search);
  return store.getReworkLedgers();
}

export async function createReworkLedger(ledgerData: Record<string, unknown>, createdBy: number) {
  if (isSupabaseConfigured()) return sbCreate('rework_ledgers', { ...ledgerData, created_by: createdBy });
  return store.createReworkLedger(ledgerData as any, createdBy);
}

export async function updateReworkLedger(id: number, updates: Record<string, unknown>) {
  if (isSupabaseConfigured()) return sbUpdate('rework_ledgers', id, updates);
  return store.updateReworkLedger(id, updates);
}

export async function deleteReworkLedger(id: number) {
  if (isSupabaseConfigured()) return sbDelete('rework_ledgers', id);
  store.deleteReworkLedger(id);
  return { success: true };
}

// ─── Data Export/Import ──────────────────────────────────

export function exportAllData() {
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

export function importAllData(data: any) {
  if (data.users?.length) localStorage.setItem('bo_users', JSON.stringify(data.users));
  if (data.projects?.length) localStorage.setItem('bo_projects', JSON.stringify(data.projects));
  if (data.contract_templates?.length) localStorage.setItem('bo_templates', JSON.stringify(data.contract_templates));
  if (data.contracts?.length) localStorage.setItem('bo_contracts', JSON.stringify(data.contracts));
  if (data.project_budgets?.length) localStorage.setItem('bo_budgets', JSON.stringify(data.project_budgets));
  if (data.quality_records?.length) localStorage.setItem('bo_quality', JSON.stringify(data.quality_records));
  if (data.idle_logs?.length) localStorage.setItem('bo_idleLogs', JSON.stringify(data.idle_logs));
  if (data.rework_ledgers?.length) localStorage.setItem('bo_reworks', JSON.stringify(data.rework_ledgers));
}
