import type { TRPCLink } from "@trpc/client";
import { TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import * as store from "@/lib/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

// ─── Supabase helpers ────────────────────────────────────

const TABLE_MAP: Record<string, string> = {
  users: "users",
  projects: "projects",
  contract_templates: "contract_templates",
  contracts: "contracts",
  project_budgets: "project_budgets",
  quality_records: "quality_records",
  idle_logs: "idle_logs",
  rework_ledgers: "rework_ledgers",
};

async function sbList(table: string) {
  const dbTable = TABLE_MAP[table];
  if (!dbTable) return [];
  const { data, error } = await supabase.from(dbTable).select("*").order("id");
  if (error) return [];
  return data || [];
}

async function sbCreate(table: string, values: any) {
  const dbTable = TABLE_MAP[table];
  if (!dbTable) return null;
  const { data, error } = await supabase.from(dbTable).insert(values).select().single();
  if (error) throw new Error(error.message);
  return data;
}

async function sbUpdate(table: string, id: number, values: any) {
  const dbTable = TABLE_MAP[table];
  if (!dbTable) return;
  await supabase.from(dbTable).update(values).eq("id", id);
}

async function sbDelete(table: string, id: number) {
  const dbTable = TABLE_MAP[table];
  if (!dbTable) return;
  await supabase.from(dbTable).delete().eq("id", id);
}

// ─── Two-way sync: read from Supabase, write to Supabase ──

async function syncFromRemote(key: string, table: string) {
  if (!isSupabaseConfigured()) return;
  const remote = await sbList(table);
  if (remote && remote.length > 0) {
    localStorage.setItem(key, JSON.stringify(remote));
  }
}

async function syncCreate(key: string, table: string, values: any) {
  await sbCreate(table, values);
  await syncFromRemote(key, table);
}

async function syncUpdate(key: string, table: string, id: number, values: any) {
  await sbUpdate(table, id, values);
  await syncFromRemote(key, table);
}

async function syncDelete(key: string, table: string, id: number) {
  await sbDelete(table, id);
  await syncFromRemote(key, table);
}

// ─── Path handlers ───────────────────────────────────────

const pathMap: Record<string, (input: any) => any> = {
  // Auth
  "localAuth.login": async (input: { username: string; password: string }) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", input.username)
        .single();
      if (error || !data) throw new Error("用户名或密码错误");
      if (data.password !== store.simpleHash(input.password)) throw new Error("用户名或密码错误");
      if (data.status !== "active") throw new Error("账号已停用");
      const session = { userId: data.id, username: data.username, name: data.name, role: data.role };
      localStorage.setItem("bo_session", JSON.stringify(session));
      return { token: "local-token-" + Date.now(), user: { id: data.id, username: data.username, name: data.name, role: data.role } };
    }
    const session = store.login(input.username, input.password);
    return { token: "local-token-" + Date.now(), user: { id: session.userId, username: session.username, name: session.name, role: session.role } };
  },
  "localAuth.me": async () => {
    const sessionStr = localStorage.getItem("bo_session");
    if (!sessionStr) return null;
    try {
      const session = JSON.parse(sessionStr);
      return { id: session.userId, username: session.username, name: session.name, role: session.role };
    } catch { return null; }
  },
  "localAuth.logout": () => {
    store.logout();
    return { success: true };
  },
  "localAuth.changePassword": async (input: { oldPassword: string; newPassword: string }) => {
    const session = store.me();
    if (!session) throw new Error("未登录");
    const users = store.getUsers();
    const user = users.find((u: any) => u.id === session.userId);
    if (!user) throw new Error("用户不存在");
    if (user.password !== store.simpleHash(input.oldPassword)) throw new Error("原密码错误");
    const newHash = store.simpleHash(input.newPassword);
    store.updateUser(user.id, { password: newHash });
    if (isSupabaseConfigured()) {
      await syncUpdate("bo_users", "users", user.id, { password: newHash });
    }
    return { success: true };
  },

  // Users
  "user.list": async () => {
    await syncFromRemote("bo_users", "users");
    return store.getUsers();
  },
  "user.create": async (input: any) => {
    const hashedPw = store.simpleHash(input.password || " ");
    const result = store.createUser({ ...input, password: hashedPw });
    if (isSupabaseConfigured()) {
      await syncCreate("bo_users", "users", { ...input, password: hashedPw, id: result.id, created_at: result.createdAt });
    }
    return { id: result.id, success: true };
  },
  "user.update": async (input: any) => {
    const { id, ...data } = input;
    if (data.password) data.password = store.simpleHash(data.password);
    store.updateUser(id, data);
    if (isSupabaseConfigured()) {
      await syncUpdate("bo_users", "users", id, data);
    }
    return { success: true };
  },
  "user.delete": async (input: number) => {
    store.deleteUser(input);
    if (isSupabaseConfigured()) {
      await syncDelete("bo_users", "users", input);
    }
    return { success: true };
  },

  // Projects
  "project.list": async () => {
    await syncFromRemote("bo_projects", "projects");
    return store.getProjects();
  },
  "project.create": async (input: any) => {
    const result = store.createProject(input);
    if (isSupabaseConfigured()) {
      await syncCreate("bo_projects", "projects", { ...input, id: result.id, created_at: result.createdAt });
    }
    return { id: result.id, success: true };
  },
  "project.update": async (input: any) => {
    const { id, ...data } = input;
    store.updateProject(id, data);
    if (isSupabaseConfigured()) {
      await syncUpdate("bo_projects", "projects", id, data);
    }
    return { success: true };
  },
  "project.delete": async (input: number) => {
    store.deleteProject(input);
    if (isSupabaseConfigured()) {
      await syncDelete("bo_projects", "projects", input);
    }
    return { success: true };
  },

  // Contract Templates
  "contractTemplate.list": async () => {
    await syncFromRemote("bo_templates", "contract_templates");
    return store.getTemplates();
  },
  "contractTemplate.create": async (input: any) => {
    const session = store.me();
    const result = store.createTemplate(input, session?.userId || 1);
    if (isSupabaseConfigured()) {
      await syncCreate("bo_templates", "contract_templates", { ...input, created_by: session?.userId || 1, id: result.id, created_at: result.createdAt });
    }
    return { id: result.id, success: true };
  },
  "contractTemplate.update": async (input: any) => {
    const { id, ...data } = input;
    store.updateTemplate(id, data);
    if (isSupabaseConfigured()) {
      await syncUpdate("bo_templates", "contract_templates", id, data);
    }
    return { success: true };
  },
  "contractTemplate.delete": async (input: number) => {
    store.deleteTemplate(input);
    if (isSupabaseConfigured()) {
      await syncDelete("bo_templates", "contract_templates", input);
    }
    return { success: true };
  },

  // Contracts
  "contract.list": async (input?: { search?: string; status?: string }) => {
    await syncFromRemote("bo_contracts", "contracts");
    let list = store.getContracts();
    if (input?.status) list = list.filter((c: any) => c.status === input.status);
    return list;
  },
  "contract.getById": async (input: number) => {
    await syncFromRemote("bo_contracts", "contracts");
    return store.getContractById(input);
  },
  "contract.create": async (input: any) => {
    const session = store.me();
    const result = store.createContract(input, session?.userId || 1);
    if (isSupabaseConfigured()) {
      await syncCreate("bo_contracts", "contracts", { ...result, created_by: session?.userId || 1 });
    }
    return { id: result.id, contractNo: result.contractNo, success: true };
  },
  "contract.update": async (input: any) => {
    const { id, ...data } = input;
    store.updateContract(id, data);
    if (isSupabaseConfigured()) {
      await syncUpdate("bo_contracts", "contracts", id, data);
    }
    return { success: true };
  },
  "contract.delete": async (input: number) => {
    store.deleteContract(input);
    if (isSupabaseConfigured()) {
      await syncDelete("bo_contracts", "contracts", input);
    }
    return { success: true };
  },

  // Budgets
  "budget.list": async () => {
    await syncFromRemote("bo_budgets", "project_budgets");
    return store.getBudgets();
  },
  "budget.getById": async (input: number) => {
    await syncFromRemote("bo_budgets", "project_budgets");
    const budget = store.getBudgetById(input);
    if (budget) {
      const contracts = store.getContracts();
      const contract = contracts.find((c: any) => c.id === budget.contractId);
      return { ...budget, contract: contract || null };
    }
    return budget;
  },
  "budget.create": async (input: any) => {
    const session = store.me();
    const result = store.createBudget(input, session?.userId || 1);
    if (isSupabaseConfigured()) {
      await syncCreate("bo_budgets", "project_budgets", { ...result, created_by: session?.userId || 1 });
    }
    return { id: result.id, budgetNo: result.budgetNo, success: true };
  },
  "budget.delete": async (input: number) => {
    store.deleteBudget(input);
    if (isSupabaseConfigured()) {
      await syncDelete("bo_budgets", "project_budgets", input);
    }
    return { success: true };
  },

  // Quality Records
  "quality.list": async () => {
    await syncFromRemote("bo_quality", "quality_records");
    return store.getQualityRecords();
  },
  "quality.create": async (input: any) => {
    const session = store.me();
    const result = store.createQualityRecord(input, session?.userId || 1);
    if (isSupabaseConfigured()) {
      await syncCreate("bo_quality", "quality_records", { ...result, created_by: session?.userId || 1 });
    }
    return { id: result.id, success: true };
  },
  "quality.update": async (input: any) => {
    const { id, ...data } = input;
    store.updateQualityRecord(id, data);
    if (isSupabaseConfigured()) {
      await syncUpdate("bo_quality", "quality_records", id, data);
    }
    return { success: true };
  },
  "quality.delete": async (input: number) => {
    store.deleteQualityRecord(input);
    if (isSupabaseConfigured()) {
      await syncDelete("bo_quality", "quality_records", input);
    }
    return { success: true };
  },

  // Idle Logs
  "idleLog.list": async () => {
    await syncFromRemote("bo_idleLogs", "idle_logs");
    return store.getIdleLogs();
  },
  "idleLog.create": async (input: any) => {
    const session = store.me();
    const result = store.createIdleLog(input, session?.userId || 1);
    if (isSupabaseConfigured()) {
      await syncCreate("bo_idleLogs", "idle_logs", { ...result, created_by: session?.userId || 1 });
    }
    return { id: result.id, success: true };
  },
  "idleLog.update": async (input: any) => {
    const { id, ...data } = input;
    store.updateIdleLog(id, data);
    if (isSupabaseConfigured()) {
      await syncUpdate("bo_idleLogs", "idle_logs", id, data);
    }
    return { success: true };
  },
  "idleLog.delete": async (input: number) => {
    store.deleteIdleLog(input);
    if (isSupabaseConfigured()) {
      await syncDelete("bo_idleLogs", "idle_logs", input);
    }
    return { success: true };
  },

  // Rework Ledgers
  "rework.list": async () => {
    await syncFromRemote("bo_reworks", "rework_ledgers");
    return store.getReworkLedgers();
  },
  "rework.create": async (input: any) => {
    const session = store.me();
    const result = store.createReworkLedger(input, session?.userId || 1);
    if (isSupabaseConfigured()) {
      await syncCreate("bo_reworks", "rework_ledgers", { ...result, created_by: session?.userId || 1 });
    }
    return { id: result.id, success: true };
  },
  "rework.update": async (input: any) => {
    const { id, ...data } = input;
    store.updateReworkLedger(id, data);
    if (isSupabaseConfigured()) {
      await syncUpdate("bo_reworks", "rework_ledgers", id, data);
    }
    return { success: true };
  },
  "rework.delete": async (input: number) => {
    store.deleteReworkLedger(input);
    if (isSupabaseConfigured()) {
      await syncDelete("bo_reworks", "rework_ledgers", input);
    }
    return { success: true };
  },
};

// ─── TRPC Link ───────────────────────────────────────────

export const localDataLink: TRPCLink<any> =
  () =>
  ({ op, next }) => {
    return observable((observer) => {
      const handler = pathMap[op.path];
      if (!handler) {
        return next(op).subscribe(observer);
      }

      try {
        const result = handler(op.input);
        Promise.resolve(result)
          .then((data) => {
            observer.next({
              result: {
                type: "data" as const,
                data: data ?? null,
              },
            });
            observer.complete();
          })
          .catch((err: any) => observer.error(TRPCClientError.from(err instanceof Error ? err : new Error(String(err)))));
      } catch (err: any) {
        observer.error(TRPCClientError.from(err instanceof Error ? err : new Error(String(err))));
      }
    });
  };
