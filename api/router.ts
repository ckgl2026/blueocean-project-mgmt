import { authRouter } from "./auth-router";
import { localAuthRouter } from "./local-auth-router";
import { userRouter } from "./user-router";
import { projectRouter } from "./project-router";
import { contractTemplateRouter } from "./contract-template-router";
import { contractRouter } from "./contract-router";
import { budgetRouter } from "./budget-router";
import { qualityRouter } from "./quality-router";
import { idleLogRouter } from "./idle-log-router";
import { reworkRouter } from "./rework-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  localAuth: localAuthRouter,
  user: userRouter,
  project: projectRouter,
  contractTemplate: contractTemplateRouter,
  contract: contractRouter,
  budget: budgetRouter,
  quality: qualityRouter,
  idleLog: idleLogRouter,
  rework: reworkRouter,
});

export type AppRouter = typeof appRouter;
