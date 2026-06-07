import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, ArrowLeft, Printer } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

interface PaymentItem { date: string; amount: number; note: string; }

export default function ContractForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    name: "环保项目供需合同", templateId: 0, partyB: "",
    contractDate: new Date().toISOString().split("T")[0],
    productName: "", quantity: 1, taxPrice: 0, taxAmount: 0,
    taxRate: 13, invoiceType: "增值税专用发票", projectName: "",
    paymentSchedule: [] as PaymentItem[], content: ""
  });

  const { data: templates = [] } = trpc.contractTemplate.list.useQuery();
  const { data: projects = [] } = trpc.project.list.useQuery();
  const { data: editContract } = trpc.contract.getById.useQuery(
    { id: Number(id) },
    { enabled: isEdit }
  );

  const createMut = trpc.contract.create.useMutation({
    onSuccess: () => { utils.contract.list.invalidate(); toast.success("合同创建成功"); navigate("/contracts"); }
  });
  const updateMut = trpc.contract.update.useMutation({
    onSuccess: () => { utils.contract.list.invalidate(); toast.success("合同更新成功"); navigate("/contracts"); }
  });

  useEffect(() => {
    if (isEdit && editContract) {
      const c = editContract as unknown as { name: string; templateId: number | null; partyB: string; contractDate: Date | string; productName: string; quantity: string | number; taxPrice: string | number; taxAmount: string | number; taxRate: string | number; invoiceType: string; projectName: string; paymentSchedule: PaymentItem[]; content: string | null };
      setForm({
        name: c.name, templateId: c.templateId || 0, partyB: c.partyB,
        contractDate: new Date(c.contractDate).toISOString().split("T")[0],
        productName: c.productName, quantity: Number(c.quantity),
        taxPrice: Number(c.taxPrice), taxAmount: Number(c.taxAmount),
        taxRate: Number(c.taxRate), invoiceType: c.invoiceType,
        projectName: c.projectName, paymentSchedule: c.paymentSchedule || [],
        content: c.content || ""
      });
    }
  }, [isEdit, editContract]);

  useEffect(() => {
    setForm(p => ({ ...p, taxAmount: Number((p.quantity * p.taxPrice).toFixed(2)) }));
  }, [form.quantity, form.taxPrice]);

  const addPayment = () => setForm(p => ({ ...p, paymentSchedule: [...p.paymentSchedule, { date: new Date().toISOString().split("T")[0], amount: 0, note: "" }] }));
  const removePayment = (i: number) => setForm(p => ({ ...p, paymentSchedule: p.paymentSchedule.filter((_, idx) => idx !== i) }));
  const updatePayment = (i: number, field: keyof PaymentItem, value: string | number) => setForm(p => ({ ...p, paymentSchedule: p.paymentSchedule.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));

  const handleSubmit = () => {
    if (!form.partyB || !form.productName || !form.projectName) { toast.error("请填写完整信息"); return; }
    const payload = { ...form, templateId: form.templateId || undefined, taxAmount: form.taxAmount };
    if (isEdit) updateMut.mutate({ id: Number(id), ...payload });
    else createMut.mutate(payload);
  };

  const handlePrintPreview = () => {
    const tmpl = templates.find((t: { id: number }) => t.id === form.templateId);
    let html = tmpl?.content || form.content || "";
    const psHtml = form.paymentSchedule.map((p) => `<tr><td style="border:1px solid #333;padding:8px">${p.date}</td><td style="border:1px solid #333;padding:8px;text-align:right">${Number(p.amount).toFixed(2)}</td><td style="border:1px solid #333;padding:8px">${p.note}</td></tr>`).join("");
    html = html.replace(/\{\{contractName\}\}/g, form.name).replace(/\{\{contractNo\}\}/g, "预览-未生成").replace(/\{\{partyB\}\}/g, form.partyB).replace(/\{\{contractDate\}\}/g, form.contractDate).replace(/\{\{projectName\}\}/g, form.projectName).replace(/\{\{productName\}\}/g, form.productName).replace(/\{\{quantity\}\}/g, String(form.quantity)).replace(/\{\{taxPrice\}\}/g, Number(form.taxPrice).toFixed(2)).replace(/\{\{taxAmount\}\}/g, form.taxAmount.toFixed(2)).replace(/\{\{taxRate\}\}/g, String(form.taxRate)).replace(/\{\{invoiceType\}\}/g, form.invoiceType).replace(/\{\{paymentSchedule\}\}/g, `<table style="width:100%;border-collapse:collapse"><tr style="background:#f5f5f5"><th style="border:1px solid #333;padding:8px">日期</th><th style="border:1px solid #333;padding:8px">金额(元)</th><th style="border:1px solid #333;padding:8px">备注</th></tr>${psHtml}</table>`);
    const pw = window.open("", "_blank");
    if (pw) { pw.document.write(html); pw.document.close(); pw.print(); }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Button variant="outline" size="sm" onClick={() => navigate("/contracts")}><ArrowLeft className="w-4 h-4 mr-1" />返回</Button><h1 className="text-2xl font-bold text-gray-900">{isEdit ? "编辑合同" : "创建合同"}</h1></div>
          <div className="flex gap-2"><Button variant="outline" onClick={handlePrintPreview}><Printer className="w-4 h-4 mr-1" />预览打印</Button><Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}><Save className="w-4 h-4 mr-1" />保存</Button></div>
        </div>
        <Card><CardHeader><CardTitle className="text-base">基本信息</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2"><Label>合同名称</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="环保项目供需合同" /></div>
          <div className="space-y-2 md:col-span-2"><Label>合同模板</Label>
            <Select value={form.templateId?.toString() || ""} onValueChange={(v) => setForm({ ...form, templateId: Number(v) })}>
              <SelectTrigger><SelectValue placeholder="选择合同模板" /></SelectTrigger>
              <SelectContent>{templates.map((t: { id: number; name: string }) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>需方（乙方）</Label><Input value={form.partyB} onChange={(e) => setForm({ ...form, partyB: e.target.value })} placeholder="请输入需方名称" /></div>
          <div className="space-y-2"><Label>合同日期</Label><Input type="date" value={form.contractDate} onChange={(e) => setForm({ ...form, contractDate: e.target.value })} /></div>
          <div className="space-y-2 md:col-span-2"><Label>项目名称</Label>
            <Select value={form.projectName} onValueChange={(v) => setForm({ ...form, projectName: v })}>
              <SelectTrigger><SelectValue placeholder="选择项目名称" /></SelectTrigger>
              <SelectContent>{projects.map((p: { id: number; name: string }) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">产品信息</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-3"><Label>产品或服务名称</Label><Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="请输入产品或服务名称" /></div>
          <div className="space-y-2"><Label>数量</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label>含税价格（元）</Label><Input type="number" min={0} step={0.01} value={form.taxPrice} onChange={(e) => setForm({ ...form, taxPrice: Number(e.target.value) })} /></div>
          <div className="space-y-2"><Label>含税金额（元）</Label><Input value={form.taxAmount} readOnly className="bg-gray-50" /></div>
          <div className="space-y-2"><Label>税率（%）</Label><Input type="number" min={0} max={100} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} /></div>
          <div className="space-y-2 md:col-span-2"><Label>发票种类</Label>
            <Select value={form.invoiceType} onValueChange={(v) => setForm({ ...form, invoiceType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="增值税专用发票">增值税专用发票</SelectItem><SelectItem value="增值税普通发票">增值税普通发票</SelectItem><SelectItem value="电子发票">电子发票</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">开票与收款计划</CardTitle><Button variant="outline" size="sm" onClick={addPayment}><Plus className="w-4 h-4 mr-1" />添加</Button></CardHeader><CardContent>
          {form.paymentSchedule.length === 0 ? <p className="text-gray-400 text-center py-4">暂无收款计划，点击添加</p> : (
            <div className="space-y-3">
              {form.paymentSchedule.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-3 space-y-1"><Label className="text-xs">日期</Label><Input type="date" value={item.date} onChange={(e) => updatePayment(index, "date", e.target.value)} /></div>
                  <div className="col-span-3 space-y-1"><Label className="text-xs">金额（元）</Label><Input type="number" value={item.amount} onChange={(e) => updatePayment(index, "amount", Number(e.target.value))} /></div>
                  <div className="col-span-5 space-y-1"><Label className="text-xs">备注</Label><Input value={item.note} onChange={(e) => updatePayment(index, "note", e.target.value)} placeholder="如：预付款、进度款等" /></div>
                  <div className="col-span-1"><Button variant="ghost" size="sm" className="text-red-600" onClick={() => removePayment(index)}><Trash2 className="w-4 h-4" /></Button></div>
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      </div>
    </MainLayout>
  );
}
