// Pure frontend data store using localStorage
// No backend dependencies - works with static deployment

// ─── Simple password hashing (sync, no bcrypt dependency) ─

export function simpleHash(password: string): string {
  // Simple hash for frontend-only storage
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return "bo_" + Math.abs(hash).toString(36) + "_" + password.length;
}

function simpleCompare(password: string, hashed: string): boolean {
  return simpleHash(password) === hashed;
}

// ─── Types ───────────────────────────────────────────────

export interface User {
  id: number;
  username: string;
  name: string;
  password: string; // hashed
  role: "super_admin" | "contract_admin" | "project_manager";
  status: "active" | "inactive";
  createdAt: string;
}

export interface ContractTemplate {
  id: number;
  name: string;
  content: string;
  description: string;
  createdBy: number;
  createdAt: string;
}

export interface PaymentItem {
  date: string;
  amount: number;
  note: string;
}

export interface Contract {
  id: number;
  contractNo: string;
  name: string;
  templateId: number | null;
  status: "signed" | "executing" | "completed";
  partyB: string;
  contractDate: string;
  productName: string;
  quantity: number;
  taxPrice: number;
  taxAmount: number;
  taxRate: number;
  invoiceType: string;
  projectName: string;
  paymentSchedule: PaymentItem[];
  content: string;
  createdBy: number;
  createdAt: string;
}

export interface MaterialItem {
  materialName: string;
  quantity: number;
  price: number;
  amount: number;
  taxRate: number;
  supplier: string;
  arrivalDate: string;
}

export interface BudgetSummary {
  budgetQty: number;
  budgetAmount: number;
  actualQty: number;
  actualAmount: number;
  diffQty: number;
  diffAmount: number;
  diffReason: string;
}

export interface ProjectBudget {
  id: number;
  projectName: string;
  contractId: number;
  budgetNo: string;
  part1Materials: MaterialItem[];
  part2Labor: {
    workshopFee: number;
    pmSalary: number;
    staffSalary: number;
    otherLabor: number;
  };
  part3Other: {
    processingFee: number;
    fuelFee: number;
    weldingFee: number;
    transportFee: number;
    certFee: number;
    auditFee: number;
    otherFee: number;
  };
  budgetSummary: BudgetSummary;
  notes: string;
  createdBy: number;
  createdAt: string;
}

export interface QualityRecord {
  id: number;
  projectName: string;
  recordDate: string;
  itemName: string;
  specification: string;
  checkMethod: string;
  checkResult: "pass" | "fail" | "pending";
  inspector: string;
  remark: string;
  createdBy: number;
  createdAt: string;
}

export interface IdleLog {
  id: number;
  projectName: string;
  idleDate: string;
  reason: string;
  causeCategory: "material_delay" | "drawing_incomplete" | "site_not_ready" | "other";
  peopleDays: number;
  directCost: number;
  scheduleImpact: string;
  createdBy: number;
  createdAt: string;
}

export interface ReworkLedger {
  id: number;
  projectName: string;
  reworkDate: string;
  reason: string;
  causeCategory: "design_error" | "client_change" | "material_defect" | "construction_error" | "other";
  reworkItem: string;
  quantity: number;
  cost: number;
  responsibleParty: string;
  solution: string;
  deadline: string;
  createdBy: number;
  createdAt: string;
}

// ─── Storage Helpers ─────────────────────────────────────

const STORAGE_KEYS = {
  users: "bo_users",
  templates: "bo_templates",
  contracts: "bo_contracts",
  budgets: "bo_budgets",
  quality: "bo_quality",
  idleLogs: "bo_idleLogs",
  reworks: "bo_reworks",
  session: "bo_session",
  seq: "bo_seq",
};

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextId(): number {
  const current = parseInt(localStorage.getItem(STORAGE_KEYS.seq) || "0", 10);
  const next = current + 1;
  localStorage.setItem(STORAGE_KEYS.seq, String(next));
  return next;
}

// ─── Seed Data ───────────────────────────────────────────

function seedIfEmpty() {
  const users = getItem<User[]>(STORAGE_KEYS.users, []);
  if (users.length === 0) {
    // Space password hash = "bo_w_1" (32.toString(36) = "w")
    const spacePw = "bo_w_1";
    const admin: User = {
      id: nextId(),
      username: "wangshujun",
      name: "汪树军",
      password: spacePw,
      role: "super_admin",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const contractAdmin: User = {
      id: nextId(),
      username: "hetong",
      name: "合同管理员",
      password: spacePw,
      role: "contract_admin",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const projectManager: User = {
      id: nextId(),
      username: "jingli",
      name: "项目经理人",
      password: spacePw,
      role: "project_manager",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.users, [admin, contractAdmin, projectManager]);

    // Create default contract template
    const template: ContractTemplate = {
      id: nextId(),
      name: "环保项目供需合同模板",
      description: "蓝海公司环保项目标准供需合同模板",
      content: `<div style="font-family: 'SimSun', serif; padding: 40px; max-width: 800px; margin: 0 auto;">
  <h1 style="text-align: center; font-size: 22px; margin-bottom: 30px;">{{contractName}}</h1>
  <p style="text-align: right; margin-bottom: 20px;">合同编号：{{contractNo}}</p>
  <p style="margin-bottom: 15px;">供方（甲方）：蓝海公司</p>
  <p style="margin-bottom: 15px;">需方（乙方）：<u>{{partyB}}</u></p>
  <p style="text-indent: 2em; margin: 20px 0;">根据《中华人民共和国民法典》及相关法律法规，甲乙双方本着平等互利、诚实信用的原则，经友好协商，就乙方向甲方采购以下产品（服务）事宜达成如下协议：</p>
  <h3 style="margin: 20px 0 10px;">一、产品（服务）明细</h3>
  <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
    <tr style="background: #f5f5f5;">
      <th style="border: 1px solid #333; padding: 8px;">项目名称</th>
      <th style="border: 1px solid #333; padding: 8px;">产品/服务名称</th>
      <th style="border: 1px solid #333; padding: 8px;">数量</th>
      <th style="border: 1px solid #333; padding: 8px;">含税单价(元)</th>
      <th style="border: 1px solid #333; padding: 8px;">含税金额(元)</th>
      <th style="border: 1px solid #333; padding: 8px;">税率</th>
    </tr>
    <tr>
      <td style="border: 1px solid #333; padding: 8px; text-align: center;">{{projectName}}</td>
      <td style="border: 1px solid #333; padding: 8px; text-align: center;">{{productName}}</td>
      <td style="border: 1px solid #333; padding: 8px; text-align: center;">{{quantity}}</td>
      <td style="border: 1px solid #333; padding: 8px; text-align: center;">{{taxPrice}}</td>
      <td style="border: 1px solid #333; padding: 8px; text-align: center;">{{taxAmount}}</td>
      <td style="border: 1px solid #333; padding: 8px; text-align: center;">{{taxRate}}%</td>
    </tr>
  </table>
  <h3 style="margin: 20px 0 10px;">二、发票信息</h3>
  <p>发票种类：<u>{{invoiceType}}</u></p>
  <h3 style="margin: 20px 0 10px;">三、付款方式</h3>
  {{paymentSchedule}}
  <h3 style="margin: 20px 0 10px;">四、交货及验收</h3>
  <p style="text-indent: 2em;">1. 交货地点：乙方指定地点</p>
  <p style="text-indent: 2em;">2. 验收标准：按照国家相关标准及双方约定的技术要求执行</p>
  <p style="text-indent: 2em;">3. 质保期：自验收合格之日起12个月</p>
  <h3 style="margin: 20px 0 10px;">五、违约责任</h3>
  <p style="text-indent: 2em;">1. 甲方逾期交货的，每逾期一日，按合同总额的千分之三向乙方支付违约金</p>
  <p style="text-indent: 2em;">2. 乙方逾期付款的，每逾期一日，按未付款项的千分之三向甲方支付违约金</p>
  <h3 style="margin: 20px 0 10px;">六、争议解决</h3>
  <p style="text-indent: 2em;">本合同在履行过程中发生的争议，由双方协商解决；协商不成的，依法向甲方所在地人民法院提起诉讼。</p>
  <h3 style="margin: 20px 0 10px;">七、其他</h3>
  <p style="text-indent: 2em;">1. 本合同一式两份，甲乙双方各执一份</p>
  <p style="text-indent: 2em;">2. 本合同自双方签字盖章之日起生效</p>
  <p style="text-indent: 2em;">3. 本合同未尽事宜，双方可另行签订补充协议</p>
  <div style="margin-top: 60px; display: flex; justify-content: space-between;">
    <div>
      <p>供方（甲方）：蓝海公司</p>
      <p style="margin-top: 40px;">法定代表人/授权代表（签字）：___________</p>
      <p style="margin-top: 20px;">日期：<u>{{contractDate}}</u></p>
    </div>
    <div>
      <p>需方（乙方）：<u>{{partyB}}</u></p>
      <p style="margin-top: 40px;">法定代表人/授权代表（签字）：___________</p>
      <p style="margin-top: 20px;">日期：<u>{{contractDate}}</u></p>
    </div>
  </div>
</div>`,
      createdBy: admin.id,
      createdAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.templates, [template]);

    console.log("[store] Seeded initial data");
  }
}

// Call seed on module load
// Always ensure clean state on first load
const bo_version = localStorage.getItem("bo_version");
if (bo_version !== "v3") {
  console.log("[store] Version mismatch, resetting data. Old:", bo_version);
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  localStorage.setItem("bo_version", "v3");
}
seedIfEmpty();

// ─── User CRUD ───────────────────────────────────────────

export function getUsers(): User[] {
  return getItem<User[]>(STORAGE_KEYS.users, []);
}

export function findUserByUsername(username: string): User | undefined {
  return getUsers().find((u) => u.username === username);
}

export function findUserById(id: number): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function createUser(data: Omit<User, "id" | "createdAt">): User {
  const users = getUsers();
  if (users.some((u) => u.username === data.username)) {
    throw new Error("用户名已存在");
  }
  const user: User = { ...data, id: nextId(), createdAt: new Date().toISOString() };
  setItem(STORAGE_KEYS.users, [...users, user]);
  return user;
}

export function updateUser(id: number, data: Partial<User>): User {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("用户不存在");
  users[idx] = { ...users[idx], ...data };
  setItem(STORAGE_KEYS.users, users);
  return users[idx];
}

export function deleteUser(id: number): void {
  const users = getUsers();
  const user = users.find((u) => u.id === id);
  if (user?.role === "super_admin") throw new Error("不能删除超级管理员");
  setItem(
    STORAGE_KEYS.users,
    users.filter((u) => u.id !== id)
  );
}

// ─── Contract Template CRUD ──────────────────────────────

export function getTemplates(): ContractTemplate[] {
  return getItem<ContractTemplate[]>(STORAGE_KEYS.templates, []);
}

export function getTemplateById(id: number): ContractTemplate | undefined {
  return getTemplates().find((t) => t.id === id);
}

export function createTemplate(data: Omit<ContractTemplate, "id" | "createdAt" | "createdBy">, createdBy: number): ContractTemplate {
  const templates = getTemplates();
  const template: ContractTemplate = { ...data, id: nextId(), createdBy, createdAt: new Date().toISOString() };
  setItem(STORAGE_KEYS.templates, [...templates, template]);
  return template;
}

export function updateTemplate(id: number, data: Partial<ContractTemplate>): ContractTemplate {
  const templates = getTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("模板不存在");
  templates[idx] = { ...templates[idx], ...data };
  setItem(STORAGE_KEYS.templates, templates);
  return templates[idx];
}

export function deleteTemplate(id: number): void {
  const templates = getTemplates();
  setItem(
    STORAGE_KEYS.templates,
    templates.filter((t) => t.id !== id)
  );
}

// ─── Contract CRUD ───────────────────────────────────────

export function getContracts(): Contract[] {
  return getItem<Contract[]>(STORAGE_KEYS.contracts, []);
}

export function getContractById(id: number): Contract | undefined {
  return getContracts().find((c) => c.id === id);
}

export function createContract(data: Omit<Contract, "id" | "contractNo" | "createdAt" | "createdBy">, createdBy: number): Contract {
  const contracts = getContracts();
  // Generate contract number
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthContracts = contracts.filter((c) => c.contractNo.startsWith(`BH-${yearMonth}`));
  const seq = monthContracts.length + 1;
  const contractNo = `BH-${yearMonth}-${String(seq).padStart(4, "0")}`;

  const contract: Contract = {
    ...data,
    id: nextId(),
    contractNo,
    createdBy,
    createdAt: new Date().toISOString(),
  };
  setItem(STORAGE_KEYS.contracts, [...contracts, contract]);
  return contract;
}

export function updateContract(id: number, data: Partial<Contract>): Contract {
  const contracts = getContracts();
  const idx = contracts.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("合同不存在");
  contracts[idx] = { ...contracts[idx], ...data };
  setItem(STORAGE_KEYS.contracts, contracts);
  return contracts[idx];
}

export function deleteContract(id: number): void {
  const contracts = getContracts();
  setItem(
    STORAGE_KEYS.contracts,
    contracts.filter((c) => c.id !== id)
  );
}

// ─── Budget CRUD ─────────────────────────────────────────

export function getBudgets(): ProjectBudget[] {
  return getItem<ProjectBudget[]>(STORAGE_KEYS.budgets, []);
}

export function getBudgetById(id: number): ProjectBudget | undefined {
  return getBudgets().find((b) => b.id === id);
}

export function createBudget(data: Omit<ProjectBudget, "id" | "budgetNo" | "createdAt" | "createdBy">, createdBy: number): ProjectBudget {
  const budgets = getBudgets();
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthBudgets = budgets.filter((b) => b.budgetNo.startsWith(`YS-${yearMonth}`));
  const seq = monthBudgets.length + 1;
  const budgetNo = `YS-${yearMonth}-${String(seq).padStart(4, "0")}`;

  const budget: ProjectBudget = {
    ...data,
    id: nextId(),
    budgetNo,
    createdBy,
    createdAt: new Date().toISOString(),
  };
  setItem(STORAGE_KEYS.budgets, [...budgets, budget]);
  return budget;
}

export function updateBudget(id: number, data: Partial<ProjectBudget>): ProjectBudget {
  const budgets = getBudgets();
  const idx = budgets.findIndex((b) => b.id === id);
  if (idx === -1) throw new Error("预算不存在");
  budgets[idx] = { ...budgets[idx], ...data };
  setItem(STORAGE_KEYS.budgets, budgets);
  return budgets[idx];
}

export function deleteBudget(id: number): void {
  const budgets = getBudgets();
  setItem(
    STORAGE_KEYS.budgets,
    budgets.filter((b) => b.id !== id)
  );
}

// ─── Quality Record CRUD ─────────────────────────────────

export function getQualityRecords(): QualityRecord[] {
  return getItem<QualityRecord[]>(STORAGE_KEYS.quality, []);
}

export function createQualityRecord(data: Omit<QualityRecord, "id" | "createdAt" | "createdBy">, createdBy: number): QualityRecord {
  const records = getQualityRecords();
  const record: QualityRecord = { ...data, id: nextId(), createdBy, createdAt: new Date().toISOString() };
  setItem(STORAGE_KEYS.quality, [...records, record]);
  return record;
}

export function updateQualityRecord(id: number, data: Partial<QualityRecord>): QualityRecord {
  const records = getQualityRecords();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error("记录不存在");
  records[idx] = { ...records[idx], ...data };
  setItem(STORAGE_KEYS.quality, records);
  return records[idx];
}

export function deleteQualityRecord(id: number): void {
  const records = getQualityRecords();
  setItem(
    STORAGE_KEYS.quality,
    records.filter((r) => r.id !== id)
  );
}

// ─── Idle Log CRUD ───────────────────────────────────────

export function getIdleLogs(): IdleLog[] {
  return getItem<IdleLog[]>(STORAGE_KEYS.idleLogs, []);
}

export function createIdleLog(data: Omit<IdleLog, "id" | "createdAt" | "createdBy">, createdBy: number): IdleLog {
  const logs = getIdleLogs();
  const log: IdleLog = { ...data, id: nextId(), createdBy, createdAt: new Date().toISOString() };
  setItem(STORAGE_KEYS.idleLogs, [...logs, log]);
  return log;
}

export function updateIdleLog(id: number, data: Partial<IdleLog>): IdleLog {
  const logs = getIdleLogs();
  const idx = logs.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("记录不存在");
  logs[idx] = { ...logs[idx], ...data };
  setItem(STORAGE_KEYS.idleLogs, logs);
  return logs[idx];
}

export function deleteIdleLog(id: number): void {
  const logs = getIdleLogs();
  setItem(
    STORAGE_KEYS.idleLogs,
    logs.filter((l) => l.id !== id)
  );
}

// ─── Rework Ledger CRUD ──────────────────────────────────

export function getReworkLedgers(): ReworkLedger[] {
  return getItem<ReworkLedger[]>(STORAGE_KEYS.reworks, []);
}

export function createReworkLedger(data: Omit<ReworkLedger, "id" | "createdAt" | "createdBy">, createdBy: number): ReworkLedger {
  const ledgers = getReworkLedgers();
  const ledger: ReworkLedger = { ...data, id: nextId(), createdBy, createdAt: new Date().toISOString() };
  setItem(STORAGE_KEYS.reworks, [...ledgers, ledger]);
  return ledger;
}

export function updateReworkLedger(id: number, data: Partial<ReworkLedger>): ReworkLedger {
  const ledgers = getReworkLedgers();
  const idx = ledgers.findIndex((l) => l.id === id);
  if (idx === -1) throw new Error("记录不存在");
  ledgers[idx] = { ...ledgers[idx], ...data };
  setItem(STORAGE_KEYS.reworks, ledgers);
  return ledgers[idx];
}

export function deleteReworkLedger(id: number): void {
  const ledgers = getReworkLedgers();
  setItem(
    STORAGE_KEYS.reworks,
    ledgers.filter((l) => l.id !== id)
  );
}

// ─── Session ─────────────────────────────────────────────

export interface Session {
  userId: number;
  username: string;
  name: string;
  role: string;
}

export function getSession(): Session | null {
  return getItem<Session | null>(STORAGE_KEYS.session, null);
}

export function setSession(session: Session): void {
  setItem(STORAGE_KEYS.session, session);
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.session);
}

// ─── Auth ────────────────────────────────────────────────

export function login(username: string, password: string): Session {
  const user = findUserByUsername(username);
  if (!user) throw new Error("用户名或密码错误");

  const valid = simpleCompare(password, user.password);
  if (!valid) throw new Error("用户名或密码错误");

  if (user.status !== "active") throw new Error("账号已停用");

  const session: Session = {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };
  setSession(session);
  return session;
}

export function logout(): void {
  clearSession();
}

export function me(): Session | null {
  return getSession();
}

// ─── Reset all data ──────────────────────────────────────

export function resetAllData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  seedIfEmpty();
}
