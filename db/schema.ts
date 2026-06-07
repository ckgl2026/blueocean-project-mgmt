import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  decimal,
  date,
  json,
  integer,
} from "drizzle-orm/pg-core";

// ─── Enums ───────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["super_admin", "contract_admin", "project_manager"]);
export const statusEnum = pgEnum("status", ["active", "inactive"]);
export const contractStatusEnum = pgEnum("contract_status", ["signed", "executing", "completed"]);
export const checkResultEnum = pgEnum("check_result", ["pass", "fail", "pending"]);
export const idleCauseEnum = pgEnum("idle_cause", ["material_delay", "drawing_incomplete", "site_not_ready", "other"]);
export const reworkCauseEnum = pgEnum("rework_cause", ["design_error", "client_change", "material_defect", "construction_error", "other"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "completed", "archived"]);

// ─── Users ───────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  role: roleEnum("role").default("project_manager").notNull(),
  status: statusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Projects ────────────────────────────────────────────

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  description: varchar("description", { length: 500 }),
  status: projectStatusEnum("status").default("active").notNull(),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Project = typeof projects.$inferSelect;

// ─── Contract Templates ──────────────────────────────────

export const contractTemplates = pgTable("contract_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  content: text("content").notNull(),
  description: varchar("description", { length: 500 }),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type ContractTemplate = typeof contractTemplates.$inferSelect;

// ─── Contracts ───────────────────────────────────────────

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  contractNo: varchar("contract_no", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  templateId: integer("template_id"),
  status: contractStatusEnum("status").default("signed").notNull(),
  partyB: varchar("party_b", { length: 200 }).notNull(),
  contractDate: date("contract_date").notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  taxPrice: decimal("tax_price", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  invoiceType: varchar("invoice_type", { length: 50 }).notNull(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  paymentSchedule: json("payment_schedule").$type<Array<{ date: string; amount: number; note: string }>>(),
  content: text("content"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Contract = typeof contracts.$inferSelect;

// ─── Project Budgets ─────────────────────────────────────

export const projectBudgets = pgTable("project_budgets", {
  id: serial("id").primaryKey(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  contractId: integer("contract_id").notNull(),
  budgetNo: varchar("budget_no", { length: 50 }).notNull().unique(),
  part1Materials: json("part1_materials").$type<Array<{
    materialName: string;
    quantity: number;
    price: number;
    exclTaxPrice: number;
    amount: number;
    taxRate: number;
    materialCost: number;
    supplier: string;
    arrivalDate: string;
  }>>(),
  part2Labor: json("part2_labor").$type<{
    workshopFee: number;
    pmSalary: number;
    staffSalary: number;
    otherLabor: number;
  }>(),
  part3Other: json("part3_other").$type<{
    processingFee: number;
    fuelFee: number;
    weldingFee: number;
    transportFee: number;
    certFee: number;
    auditFee: number;
    otherFee: number;
  }>(),
  budgetSummary: json("budget_summary").$type<{
    budgetQty: number;
    budgetAmount: number;
    actualQty: number;
    actualAmount: number;
    diffQty: number;
    diffAmount: number;
    diffReason: string;
  }>(),
  notes: text("notes"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type ProjectBudget = typeof projectBudgets.$inferSelect;

// ─── Quality Records ─────────────────────────────────────

export const qualityRecords = pgTable("quality_records", {
  id: serial("id").primaryKey(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  recordDate: date("record_date").notNull(),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  specification: varchar("specification", { length: 500 }),
  checkMethod: varchar("check_method", { length: 200 }),
  checkResult: checkResultEnum("check_result").default("pending").notNull(),
  inspector: varchar("inspector", { length: 100 }),
  remark: text("remark"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type QualityRecord = typeof qualityRecords.$inferSelect;

// ─── Idle Logs ───────────────────────────────────────────

export const idleLogs = pgTable("idle_logs", {
  id: serial("id").primaryKey(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  idleDate: date("idle_date").notNull(),
  reason: text("reason").notNull(),
  causeCategory: idleCauseEnum("cause_category").notNull(),
  peopleDays: decimal("people_days", { precision: 5, scale: 1 }).notNull(),
  directCost: decimal("direct_cost", { precision: 12, scale: 2 }).notNull(),
  scheduleImpact: varchar("schedule_impact", { length: 500 }),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type IdleLog = typeof idleLogs.$inferSelect;

// ─── Rework Ledgers ──────────────────────────────────────

export const reworkLedgers = pgTable("rework_ledgers", {
  id: serial("id").primaryKey(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  reworkDate: date("rework_date").notNull(),
  reason: text("reason").notNull(),
  causeCategory: reworkCauseEnum("cause_category").notNull(),
  reworkItem: varchar("rework_item", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 12, scale: 2 }).notNull(),
  responsibleParty: varchar("responsible_party", { length: 100 }),
  solution: text("solution"),
  deadline: date("deadline"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
});

export type ReworkLedger = typeof reworkLedgers.$inferSelect;
