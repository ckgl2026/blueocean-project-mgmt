-- Supabase 数据库初始化脚本
-- 在 Supabase Dashboard → SQL Editor → New query 中执行

-- 1. 创建 users 表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'project_manager',
  status VARCHAR(10) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建 projects 表
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL UNIQUE,
  description VARCHAR(500),
  status VARCHAR(10) NOT NULL DEFAULT 'active',
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建 contract_templates 表
CREATE TABLE IF NOT EXISTS contract_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  description VARCHAR(500),
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建 contracts 表
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  contract_no VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  template_id INTEGER,
  status VARCHAR(10) NOT NULL DEFAULT 'signed',
  party_b VARCHAR(200) NOT NULL,
  contract_date DATE NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  tax_price DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL,
  tax_rate DECIMAL(5,2) NOT NULL,
  invoice_type VARCHAR(50) NOT NULL,
  project_name VARCHAR(200) NOT NULL,
  payment_schedule JSONB,
  content TEXT,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 创建 project_budgets 表
CREATE TABLE IF NOT EXISTS project_budgets (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(200) NOT NULL,
  contract_id INTEGER NOT NULL,
  budget_no VARCHAR(50) NOT NULL UNIQUE,
  part1_materials JSONB,
  part2_labor JSONB,
  part3_other JSONB,
  budget_summary JSONB,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 创建 quality_records 表
CREATE TABLE IF NOT EXISTS quality_records (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(200) NOT NULL,
  record_date DATE NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  specification VARCHAR(500),
  check_method VARCHAR(200),
  check_result VARCHAR(10) NOT NULL DEFAULT 'pending',
  inspector VARCHAR(100),
  remark TEXT,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 创建 idle_logs 表
CREATE TABLE IF NOT EXISTS idle_logs (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(200) NOT NULL,
  idle_date DATE NOT NULL,
  reason TEXT NOT NULL,
  cause_category VARCHAR(20) NOT NULL,
  people_days DECIMAL(5,1) NOT NULL,
  direct_cost DECIMAL(12,2) NOT NULL,
  schedule_impact VARCHAR(500),
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 创建 rework_ledgers 表
CREATE TABLE IF NOT EXISTS rework_ledgers (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(200) NOT NULL,
  rework_date DATE NOT NULL,
  reason TEXT NOT NULL,
  cause_category VARCHAR(20) NOT NULL,
  rework_item VARCHAR(500) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  cost DECIMAL(12,2) NOT NULL,
  responsible_party VARCHAR(100),
  solution TEXT,
  deadline DATE,
  created_by INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 启用 RLS（行级安全）并设置公开访问策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE idle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rework_ledgers ENABLE ROW LEVEL SECURITY;

-- 10. 创建公开访问策略（允许所有操作）
CREATE POLICY "allow_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON contract_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON project_budgets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON quality_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON idle_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON rework_ledgers FOR ALL USING (true) WITH CHECK (true);

-- 11. 插入默认用户（密码为空格的哈希值）
INSERT INTO users (username, name, password, role, status)
VALUES 
  ('wangshujun', '汪树军', 'bo_w_1', 'super_admin', 'active'),
  ('hetong', '合同管理员', 'bo_w_1', 'contract_admin', 'active'),
  ('jingli', '项目经理人', 'bo_w_1', 'project_manager', 'active')
ON CONFLICT (username) DO NOTHING;

-- 12. 插入默认合同模板
INSERT INTO contract_templates (name, content, description, created_by)
VALUES (
  '环保项目供需合同模板',
  '<div style="font-family: SimSun, serif; padding: 40px; max-width: 800px; margin: 0 auto;">
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
</div>',
  '蓝海公司环保项目标准供需合同模板',
  1
)
ON CONFLICT DO NOTHING;
