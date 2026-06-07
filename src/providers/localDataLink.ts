import type { TRPCLink } from "@trpc/client";
import { TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import * as store from "@/lib/store";
import { supabase } from "@/lib/supabase";

// Supabase is always configured (hardcoded)
const SB_TABLE: Record<string, string> = {
  users: "users",
  projects: "projects",
  contract_templates: "contract_templates",
  contracts: "contracts",
  project_budgets: "project_budgets",
  quality_records: "quality_records",
  idle_logs: "idle_logs",
  rework_ledgers: "rework_ledgers",
};

const LS_KEY: Record<string, string> = {
  users: "bo_users",
  projects: "bo_projects",
  contract_templates: "bo_templates",
  contracts: "bo_contracts",
  project_budgets: "bo_budgets",
  quality_records: "bo_quality",
  idle_logs: "bo_idleLogs",
  rework_ledgers: "bo_reworks",
};

async function sbPull(table: string) {
  const t = SB_TABLE[table];
  if (!t) return;
  try {
    const { data, error } = await supabase.from(t).select("*").order("id");
    if (!error && data) {
      const key = LS_KEY[table];
      if (key) localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (e) { /* ignore */ }
}

async function sbPush(table: string, action: string, payload: any) {
  const t = SB_TABLE[table];
  if (!t) return;
  try {
    if (action === "create") {
      await supabase.from(t).insert(payload);
    } else if (action === "update") {
      const { id, ...rest } = payload;
      await supabase.from(t).update(rest).eq("id", id);
    } else if (action === "delete") {
      await supabase.from(t).delete().eq("id", payload);
    }
  } catch (e) { /* ignore */ }
  await sbPull(table);
}

const pathMap: Record<string, (input: any) => any> = {
  "localAuth.login": async (input: { username: string; password: string }) => {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("username", input.username).single();
      if (!error && data) {
        if (data.password !== store.simpleHash(input.password)) throw new Error("用户名或密码错误");
        if (data.status !== "active") throw new Error("账号已停用");
        const session = { userId: data.id, username: data.username, name: data.name, role: data.role };
        localStorage.setItem("bo_session", JSON.stringify(session));
        return { token: "t" + Date.now(), user: { id: data.id, username: data.username, name: data.name, role: data.role } };
      }
    } catch (e: any) { if (e.message && !e.message.includes("JSON")) throw e; }
    const s = store.login(input.username, input.password);
    return { token: "t" + Date.now(), user: { id: s.userId, username: s.username, name: s.name, role: s.role } };
  },
  "localAuth.me": () => {
    const str = localStorage.getItem("bo_session");
    if (!str) return null;
    try { const s = JSON.parse(str); return { id: s.userId, username: s.username, name: s.name, role: s.role }; } catch { return null; }
  },
  "localAuth.logout": () => { store.logout(); return { success: true }; },
  "localAuth.changePassword": async (input: { oldPassword: string; newPassword: string }) => {
    const session = store.me(); if (!session) throw new Error("未登录");
    const users = store.getUsers(); const user = users.find((u: any) => u.id === session.userId);
    if (!user) throw new Error("用户不存在");
    if (user.password !== store.simpleHash(input.oldPassword)) throw new Error("原密码错误");
    const h = store.simpleHash(input.newPassword); store.updateUser(user.id, { password: h });
    await sbPush("users", "update", { id: user.id, password: h });
    return { success: true };
  },

  // Users
  "user.list": async () => { await sbPull("users"); return store.getUsers(); },
  "user.create": async (input: any) => {
    const h = store.simpleHash(input.password || " "); const r = store.createUser({ ...input, password: h });
    await sbPush("users", "create", { ...input, password: h, id: r.id, created_at: r.createdAt });
    return { id: r.id, success: true };
  },
  "user.update": async (input: any) => { const { id, ...d } = input; if (d.password) d.password = store.simpleHash(d.password); store.updateUser(id, d); await sbPush("users", "update", { id, ...d }); return { success: true }; },
  "user.delete": async (input: number) => { store.deleteUser(input); await sbPush("users", "delete", input); return { success: true }; },

  // Projects
  "project.list": async () => { await sbPull("projects"); return store.getProjects(); },
  "project.create": async (input: any) => { const r = store.createProject(input); await sbPush("projects", "create", { ...input, id: r.id, created_at: r.createdAt }); return { id: r.id, success: true }; },
  "project.update": async (input: any) => { const { id, ...d } = input; store.updateProject(id, d); await sbPush("projects", "update", { id, ...d }); return { success: true }; },
  "project.delete": async (input: number) => { store.deleteProject(input); await sbPush("projects", "delete", input); return { success: true }; },

  // Templates
  "contractTemplate.list": async () => { await sbPull("contract_templates"); return store.getTemplates(); },
  "contractTemplate.create": async (input: any) => { const s = store.me(); const r = store.createTemplate(input, s?.userId || 1); await sbPush("contract_templates", "create", { ...input, created_by: s?.userId || 1, id: r.id, created_at: r.createdAt }); return { id: r.id, success: true }; },
  "contractTemplate.update": async (input: any) => { const { id, ...d } = input; store.updateTemplate(id, d); await sbPush("contract_templates", "update", { id, ...d }); return { success: true }; },
  "contractTemplate.delete": async (input: number) => { store.deleteTemplate(input); await sbPush("contract_templates", "delete", input); return { success: true }; },

  // Contracts
  "contract.list": async (input?: { search?: string; status?: string }) => { await sbPull("contracts"); let list = store.getContracts(); if (input?.status) list = list.filter((c: any) => c.status === input.status); return list; },
  "contract.getById": async (input: number) => { await sbPull("contracts"); return store.getContractById(input); },
  "contract.create": async (input: any) => { const s = store.me(); const r = store.createContract(input, s?.userId || 1); await sbPush("contracts", "create", { ...r, created_by: s?.userId || 1 }); return { id: r.id, contractNo: r.contractNo, success: true }; },
  "contract.update": async (input: any) => { const { id, ...d } = input; store.updateContract(id, d); await sbPush("contracts", "update", { id, ...d }); return { success: true }; },
  "contract.delete": async (input: number) => { store.deleteContract(input); await sbPush("contracts", "delete", input); return { success: true }; },

  // Budgets
  "budget.list": async () => { await sbPull("project_budgets"); return store.getBudgets(); },
  "budget.getById": async (input: number) => { await sbPull("project_budgets"); const b = store.getBudgetById(input); if (b) { const cs = store.getContracts(); const c = cs.find((x: any) => x.id === b.contractId); return { ...b, contract: c || null }; } return b; },
  "budget.create": async (input: any) => { const s = store.me(); const r = store.createBudget(input, s?.userId || 1); await sbPush("project_budgets", "create", { ...r, created_by: s?.userId || 1 }); return { id: r.id, budgetNo: r.budgetNo, success: true }; },
  "budget.delete": async (input: number) => { store.deleteBudget(input); await sbPush("project_budgets", "delete", input); return { success: true }; },

  // Quality
  "quality.list": async () => { await sbPull("quality_records"); return store.getQualityRecords(); },
  "quality.create": async (input: any) => { const s = store.me(); const r = store.createQualityRecord(input, s?.userId || 1); await sbPush("quality_records", "create", { ...r, created_by: s?.userId || 1 }); return { id: r.id, success: true }; },
  "quality.update": async (input: any) => { const { id, ...d } = input; store.updateQualityRecord(id, d); await sbPush("quality_records", "update", { id, ...d }); return { success: true }; },
  "quality.delete": async (input: number) => { store.deleteQualityRecord(input); await sbPush("quality_records", "delete", input); return { success: true }; },

  // Idle Logs
  "idleLog.list": async () => { await sbPull("idle_logs"); return store.getIdleLogs(); },
  "idleLog.create": async (input: any) => { const s = store.me(); const r = store.createIdleLog(input, s?.userId || 1); await sbPush("idle_logs", "create", { ...r, created_by: s?.userId || 1 }); return { id: r.id, success: true }; },
  "idleLog.update": async (input: any) => { const { id, ...d } = input; store.updateIdleLog(id, d); await sbPush("idle_logs", "update", { id, ...d }); return { success: true }; },
  "idleLog.delete": async (input: number) => { store.deleteIdleLog(input); await sbPush("idle_logs", "delete", input); return { success: true }; },

  // Rework
  "rework.list": async () => { await sbPull("rework_ledgers"); return store.getReworkLedgers(); },
  "rework.create": async (input: any) => { const s = store.me(); const r = store.createReworkLedger(input, s?.userId || 1); await sbPush("rework_ledgers", "create", { ...r, created_by: s?.userId || 1 }); return { id: r.id, success: true }; },
  "rework.update": async (input: any) => { const { id, ...d } = input; store.updateReworkLedger(id, d); await sbPush("rework_ledgers", "update", { id, ...d }); return { success: true }; },
  "rework.delete": async (input: number) => { store.deleteReworkLedger(input); await sbPush("rework_ledgers", "delete", input); return { success: true }; },
};

export const localDataLink: TRPCLink<any> =
  () =>
  ({ op, next }) => {
    return observable((observer) => {
      const handler = pathMap[op.path];
      if (!handler) { return next(op).subscribe(observer); }
      try {
        const result = handler(op.input);
        Promise.resolve(result)
          .then((data) => { observer.next({ result: { type: "data" as const, data: data ?? null } }); observer.complete(); })
          .catch((err: any) => { console.error("[link]", op.path, err); observer.error(TRPCClientError.from(err instanceof Error ? err : new Error(String(err)))); });
      } catch (err: any) { console.error("[link] catch", op.path, err); observer.error(TRPCClientError.from(err instanceof Error ? err : new Error(String(err)))); }
    });
  };
