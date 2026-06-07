import "dotenv/config";
import { getDb } from "../api/queries/connection";
import { users, contractTemplates } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  const db = getDb();
  console.log("[seed] Starting seed...");

  // Check if super admin exists
  const existing = await db.select().from(users).where(eq(users.username, "wangshujun")).limit(1);
  if (existing.length === 0) {
    const spacePw = " "; // space password
    const hashedPw = await bcrypt.hash(spacePw, 10);

    await db.insert(users).values({
      username: "wangshujun",
      name: "汪树军",
      password: hashedPw,
      role: "super_admin",
      status: "active",
    });

    await db.insert(users).values({
      username: "hetong",
      name: "合同管理员",
      password: hashedPw,
      role: "contract_admin",
      status: "active",
    });

    await db.insert(users).values({
      username: "jingli",
      name: "项目经理人",
      password: hashedPw,
      role: "project_manager",
      status: "active",
    });

    console.log("[seed] Created default users");
  }

  // Check if default template exists
  const existingTemplate = await db.select().from(contractTemplates).limit(1);
  if (existingTemplate.length === 0) {
    const admin = await db.select().from(users).where(eq(users.username, "wangshujun")).limit(1);
    const adminId = admin.length > 0 ? admin[0].id : 1;

    await db.insert(contractTemplates).values({
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
      createdBy: adminId,
    });

    console.log("[seed] Created default contract template");
  }

  console.log("[seed] Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Error:", err);
  process.exit(1);
});
