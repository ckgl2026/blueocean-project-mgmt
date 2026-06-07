import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  decimal,
  date,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

// 用户表
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["super_admin", "contract_admin", "project_manager"]).default("project_manager").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 项目表
export const projects = mysqlTable("projects", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  description: varchar("description", { length: 500 }),
  status: mysqlEnum("status", ["active", "completed", "archived"]).default("active").notNull(),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Project = typeof projects.$inferSelect;

// 合同模板表
export const contractTemplates = mysqlTable("contract_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  content: text("content").notNull(),
  description: varchar("description", { length: 500 }),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type ContractTemplate = typeof contractTemplates.$inferSelect;

// 合同表
export const contracts = mysqlTable("contracts", {
  id: serial("id").primaryKey(),
  contractNo: varchar("contract_no", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  templateId: bigint("template_id", { mode: "number", unsigned: true }),
  status: mysqlEnum("status", ["signed", "executing", "completed"]).default("signed").notNull(),
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
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Contract = typeof contracts.$inferSelect;

// 项目预算表
export const projectBudgets = mysqlTable("project_budgets", {
  id: serial("id").primaryKey(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  contractId: bigint("contract_id", { mode: "number", unsigned: true }).notNull(),
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
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type ProjectBudget = typeof projectBudgets.$inferSelect;

// 质量记录表
export const qualityRecords = mysqlTable("quality_records", {
  id: serial("id").primaryKey(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  recordDate: date("record_date").notNull(),
  itemName: varchar("item_name", { length: 200 }).notNull(),
  specification: varchar("specification", { length: 500 }),
  checkMethod: varchar("check_method", { length: 200 }),
  checkResult: mysqlEnum("check_result", ["pass", "fail", "pending"]).default("pending").notNull(),
  inspector: varchar("inspector", { length: 100 }),
  remark: text("remark"),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type QualityRecord = typeof qualityRecords.$inferSelect;

// 窝工日志表
export const idleLogs = mysqlTable("idle_logs", {
  id: serial("id").primaryKey(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  idleDate: date("idle_date").notNull(),
  reason: text("reason").notNull(),
  causeCategory: mysqlEnum("cause_category", ["material_delay", "drawing_incomplete", "site_not_ready", "other"]).notNull(),
  peopleDays: decimal("people_days", { precision: 5, scale: 1 }).notNull(),
  directCost: decimal("direct_cost", { precision: 12, scale: 2 }).notNull(),
  scheduleImpact: varchar("schedule_impact", { length: 500 }),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type IdleLog = typeof idleLogs.$inferSelect;

// 返工台账表
export const reworkLedgers = mysqlTable("rework_ledgers", {
  id: serial("id").primaryKey(),
  projectName: varchar("project_name", { length: 200 }).notNull(),
  reworkDate: date("rework_date").notNull(),
  reason: text("reason").notNull(),
  causeCategory: mysqlEnum("cause_category", ["design_error", "client_change", "material_defect", "construction_error", "other"]).notNull(),
  reworkItem: varchar("rework_item", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 12, scale: 2 }).notNull(),
  responsibleParty: varchar("responsible_party", { length: 100 }),
  solution: text("solution"),
  deadline: date("deadline"),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type ReworkLedger = typeof reworkLedgers.$inferSelect;
