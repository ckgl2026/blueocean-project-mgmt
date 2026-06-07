// tRPC link that serves data from localStorage when backend is unavailable
import type { TRPCLink } from "@trpc/client";
import { TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import * as store from "@/lib/store";

const pathMap: Record<string, (input: any) => any> = {
  // Auth
  "localAuth.login": (input) => {
    const session = store.login(input.username, input.password);
    return {
      token: "local-token-" + Date.now(),
      user: {
        id: session.userId,
        username: session.username,
        name: session.name,
        role: session.role,
      },
    };
  },
  "localAuth.me": () => {
    const session = store.me();
    if (!session) return null;
    return {
      id: session.userId,
      username: session.username,
      name: session.name,
      role: session.role,
    };
  },
  "localAuth.logout": () => {
    store.logout();
    return { success: true };
  },
  "localAuth.changePassword": (input) => {
    const session = store.me();
    if (!session) throw new Error("未登录");
    const users = store.getUsers();
    const user = users.find((u: any) => u.id === session.userId);
    if (!user) throw new Error("用户不存在");
    if (user.password !== store.simpleHash(input.oldPassword)) throw new Error("原密码错误");
    store.updateUser(user.id, { password: store.simpleHash(input.newPassword) });
    return { success: true };
  },

  // Users
  "user.list": () => store.getUsers(),
  "user.create": (input) => store.createUser(input),
  "user.update": (input) => {
    const { id, ...data } = input;
    return store.updateUser(id, data);
  },
  "user.delete": (input) => {
    store.deleteUser(input);
    return { success: true };
  },

  // Projects
  "project.list": () => store.getProjects(),
  "project.create": (input) => store.createProject(input),
  "project.update": (input) => {
    const { id, ...data } = input;
    return store.updateProject(id, data);
  },
  "project.delete": (input) => {
    store.deleteProject(input);
    return { success: true };
  },

  // Contract Templates
  "contractTemplate.list": () => store.getTemplates(),
  "contractTemplate.create": (input) => {
    const session = store.me();
    return store.createTemplate(input, session?.userId || 1);
  },
  "contractTemplate.update": (input) => {
    const { id, ...data } = input;
    return store.updateTemplate(id, data);
  },
  "contractTemplate.delete": (input) => {
    store.deleteTemplate(input);
    return { success: true };
  },

  // Contracts
  "contract.list": () => store.getContracts(),
  "contract.getById": (input) => store.getContractById(input),
  "contract.create": (input) => {
    const session = store.me();
    return store.createContract(input, session?.userId || 1);
  },
  "contract.update": (input) => {
    const { id, ...data } = input;
    return store.updateContract(id, data);
  },
  "contract.delete": (input) => {
    store.deleteContract(input);
    return { success: true };
  },

  // Budgets
  "budget.list": () => store.getBudgets(),
  "budget.getById": (input) => {
    const budget = store.getBudgetById(input);
    if (budget) {
      const contracts = store.getContracts();
      const contract = contracts.find((c: any) => c.id === budget.contractId);
      return { ...budget, contract: contract || null };
    }
    return budget;
  },
  "budget.create": (input) => {
    const session = store.me();
    return store.createBudget(input, session?.userId || 1);
  },
  "budget.delete": (input) => {
    store.deleteBudget(input);
    return { success: true };
  },

  // Quality Records
  "quality.list": () => store.getQualityRecords(),
  "quality.create": (input) => {
    const session = store.me();
    return store.createQualityRecord(input, session?.userId || 1);
  },
  "quality.update": (input) => {
    const { id, ...data } = input;
    return store.updateQualityRecord(id, data);
  },
  "quality.delete": (input) => {
    store.deleteQualityRecord(input);
    return { success: true };
  },

  // Idle Logs
  "idleLog.list": () => store.getIdleLogs(),
  "idleLog.create": (input) => {
    const session = store.me();
    return store.createIdleLog(input, session?.userId || 1);
  },
  "idleLog.update": (input) => {
    const { id, ...data } = input;
    return store.updateIdleLog(id, data);
  },
  "idleLog.delete": (input) => {
    store.deleteIdleLog(input);
    return { success: true };
  },

  // Rework Ledgers
  "rework.list": () => store.getReworkLedgers(),
  "rework.create": (input) => {
    const session = store.me();
    return store.createReworkLedger(input, session?.userId || 1);
  },
  "rework.update": (input) => {
    const { id, ...data } = input;
    return store.updateReworkLedger(id, data);
  },
  "rework.delete": (input) => {
    store.deleteReworkLedger(input);
    return { success: true };
  },
};

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
