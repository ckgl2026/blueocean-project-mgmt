import { useState, useRef } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Trash2, FileDown, Eye, Printer, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { trpc } from "@/providers/trpc";

interface MaterialItem {
  materialName: string;
  quantity: number;
  price: number;
  exclTaxPrice: number;
  amount: number;
  taxRate: number;
  materialCost: number;
  supplier: string;
  arrivalDate: string;
}

export default function BudgetManagement() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("part1");
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: budgets = [] } = trpc.budget.list.useQuery({ search: search || undefined });
  const { data: projects = [] } = trpc.project.list.useQuery();
  const { data: viewBudget } = trpc.budget.getById.useQuery({ id: viewingId! }, { enabled: !!viewingId });

  const createMut = trpc.budget.create.useMutation({
    onSuccess: () => { utils.budget.list.invalidate(); toast.success("预算创建成功"); setDialogOpen(false); resetForm(); }
  });

  const [form, setForm] = useState({
    projectName: "", contractId: 0,
    part1Materials: [] as MaterialItem[],
    part2Labor: { workshopFee: 0, pmSalary: 0, staffSalary: 0, otherLabor: 0 },
    part3Other: { processingFee: 0, fuelFee: 0, weldingFee: 0, transportFee: 0, certFee: 0, auditFee: 0, otherFee: 0 },
    budgetSummary: { budgetQty: 0, budgetAmount: 0, actualQty: 0, actualAmount: 0, diffQty: 0, diffAmount: 0, diffReason: "" },
    notes: ""
  });

  const resetForm = () => setForm({
    projectName: "", contractId: 0, part1Materials: [],
    part2Labor: { workshopFee: 0, pmSalary: 0, staffSalary: 0, otherLabor: 0 },
    part3Other: { processingFee: 0, fuelFee: 0, weldingFee: 0, transportFee: 0, certFee: 0, auditFee: 0, otherFee: 0 },
    budgetSummary: { budgetQty: 0, budgetAmount: 0, actualQty: 0, actualAmount: 0, diffQty: 0, diffAmount: 0, diffReason: "" },
    notes: ""
  });

  const addMaterial = () => setForm(p => ({
    ...p,
    part1Materials: [...p.part1Materials, { materialName: "", quantity: 0, price: 0, exclTaxPrice: 0, amount: 0, taxRate: 13, materialCost: 0, supplier: "", arrivalDate: "" }]
  }));

  const updateMaterial = (i: number, field: keyof MaterialItem, value: string | number) => {
    const updated = [...form.part1Materials];
    updated[i] = { ...updated[i], [field]: value };
    if (field === "quantity" || field === "price") updated[i].amount = updated[i].quantity * updated[i].price;
    setForm(p => ({ ...p, part1Materials: updated }));
  };

  const removeMaterial = (i: number) => setForm(p => ({ ...p, part1Materials: p.part1Materials.filter((_, idx) => idx !== i) }));

  const handleSubmit = () => {
    if (!form.projectName) { toast.error("请输入项目名称"); return; }
    const totalMaterial = form.part1Materials.reduce((s, m) => s + m.amount, 0);
    const totalLabor = Object.values(form.part2Labor).reduce((s, v) => s + v, 0);
    const totalOther = Object.values(form.part3Other).reduce((s, v) => s + v, 0);
    createMut.mutate({
      ...form,
      budgetSummary: { ...form.budgetSummary, budgetAmount: totalMaterial + totalLabor + totalOther }
    });
  };

  const handleImportMaterials = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Array<Array<string | number>> = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Skip header row, expect columns: materialName, quantity, exclTaxPrice, materialCost, supplier
        const imported: MaterialItem[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue;
          const name = String(row[0] || "").trim();
          const qty = Number(row[1]) || 0;
          const exclPrice = Number(row[2]) || 0;
          const cost = Number(row[3]) || 0;
          const supplierName = String(row[4] || "").trim();
          if (!name) continue;

          const taxRate = 13;
          const price = Number((exclPrice * (1 + taxRate / 100)).toFixed(2));
          imported.push({
            materialName: name, quantity: qty, price, exclTaxPrice: exclPrice,
            amount: Number((price * qty).toFixed(2)), taxRate, materialCost: cost,
            supplier: supplierName, arrivalDate: ""
          });
        }

        if (imported.length === 0) { toast.error("未读取到有效数据，请检查文件格式"); return; }

        setForm(p => ({ ...p, part1Materials: [...p.part1Materials, ...imported] }));
        toast.success(`成功导入 ${imported.length} 条材料记录`);
      } catch {
        toast.error("导入失败，请检查文件格式");
      }
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  const exportToExcel = () => {
    if (!viewBudget) return;
    const vb = viewBudget as unknown as { budgetNo: string; projectName: string; part1Materials: MaterialItem[]; part2Labor: { workshopFee: number; pmSalary: number; staffSalary: number; otherLabor: number }; part3Other: { processingFee: number; fuelFee: number; weldingFee: number; transportFee: number; certFee: number; auditFee: number; otherFee: number }; budgetSummary: { budgetQty: number; budgetAmount: number; actualQty: number; actualAmount: number; diffQty: number; diffAmount: number; diffReason: string } };
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["材料名称", "数量", "含税单价", "不含税单价", "金额", "税率", "材料成本", "供应商", "到货日期"], ...(vb.part1Materials || []).map((m: MaterialItem) => [m.materialName, m.quantity, m.price, m.exclTaxPrice, m.amount, `${m.taxRate}%`, m.materialCost, m.supplier, m.arrivalDate])]), "材料清单");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["费用项目", "金额"], ["车间制造费用", vb.part2Labor?.workshopFee || 0], ["项目经理工资补贴", vb.part2Labor?.pmSalary || 0], ["项目员工工资补贴", vb.part2Labor?.staffSalary || 0], ["其他人工费用", vb.part2Labor?.otherLabor || 0]]), "人工费用");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["费用项目", "金额"], ["加工费用", vb.part3Other?.processingFee || 0], ["燃油费用", vb.part3Other?.fuelFee || 0], ["焊接费用", vb.part3Other?.weldingFee || 0], ["运输费用", vb.part3Other?.transportFee || 0], ["认证费用", vb.part3Other?.certFee || 0], ["审计费用", vb.part3Other?.auditFee || 0], ["其他费用", vb.part3Other?.otherFee || 0]]), "其他费用");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["项目", "预算数量", "预算金额", "实际数量", "实际金额", "差异数量", "差异金额", "差异原因"], ["汇总", vb.budgetSummary?.budgetQty || 0, vb.budgetSummary?.budgetAmount || 0, vb.budgetSummary?.actualQty || 0, vb.budgetSummary?.actualAmount || 0, vb.budgetSummary?.diffQty || 0, vb.budgetSummary?.diffAmount || 0, vb.budgetSummary?.diffReason || ""]]), "预算汇总");
    XLSX.writeFile(wb, `项目预算-${vb.projectName}.xlsx`);
  };

  const handlePrint = () => {
    if (!viewBudget) return;
    const vb = viewBudget as unknown as { budgetNo: string; projectName: string; part1Materials: MaterialItem[]; part2Labor: { workshopFee: number; pmSalary: number; staffSalary: number; otherLabor: number }; part3Other: { processingFee: number; fuelFee: number; weldingFee: number; transportFee: number; certFee: number; auditFee: number; otherFee: number }; budgetSummary: { budgetQty: number; budgetAmount: number; actualQty: number; actualAmount: number; diffQty: number; diffAmount: number; diffReason: string } };
    const pw = window.open("", "_blank");
    if (!pw) return;
    const materials = (vb.part1Materials || []).map((m: MaterialItem) => `<tr><td>${m.materialName}</td><td>${m.quantity}</td><td>${m.price}</td><td>${m.exclTaxPrice}</td><td>${m.amount}</td><td>${m.taxRate}%</td><td>${m.materialCost}</td><td>${m.supplier}</td><td>${m.arrivalDate}</td></tr>`).join("");
    const html = `<html><head><title>项目预算表</title><style>body{font-family:SimSun,sans-serif;padding:40px}h1{text-align:center}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #333;padding:8px}th{background:#f5f5f5}.section{margin:20px 0}</style></head><body><h1>项目预算表</h1><p>预算编号：${vb.budgetNo}</p><p>项目名称：${vb.projectName}</p><div class="section"><h3>一、材料清单</h3><table><tr><th>材料名称</th><th>数量</th><th>含税单价</th><th>不含税单价</th><th>金额</th><th>税率</th><th>材料成本</th><th>供应商</th><th>到货日期</th></tr>${materials}</table></div><div class="section"><h3>二、人工费用</h3><table><tr><th>费用项目</th><th>金额</th></tr><tr><td>车间制造费用</td><td>${vb.part2Labor?.workshopFee || 0}</td></tr><tr><td>项目经理工资补贴</td><td>${vb.part2Labor?.pmSalary || 0}</td></tr><tr><td>项目员工工资补贴</td><td>${vb.part2Labor?.staffSalary || 0}</td></tr><tr><td>其他人工费用</td><td>${vb.part2Labor?.otherLabor || 0}</td></tr></table></div><div class="section"><h3>三、其他费用</h3><table><tr><th>费用项目</th><th>金额</th></tr><tr><td>加工费用</td><td>${vb.part3Other?.processingFee || 0}</td></tr><tr><td>燃油费用</td><td>${vb.part3Other?.fuelFee || 0}</td></tr><tr><td>焊接费用</td><td>${vb.part3Other?.weldingFee || 0}</td></tr><tr><td>运输费用</td><td>${vb.part3Other?.transportFee || 0}</td></tr><tr><td>认证费用</td><td>${vb.part3Other?.certFee || 0}</td></tr><tr><td>审计费用</td><td>${vb.part3Other?.auditFee || 0}</td></tr><tr><td>其他费用</td><td>${vb.part3Other?.otherFee || 0}</td></tr></table></div></body></html>`;
    pw.document.write(html); pw.document.close(); pw.print();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900">项目预算管理</h1><p className="text-gray-500 mt-1">管理项目预算和材料清单</p></div>
          <Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />新增预算</Button>
        </div>
        <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input className="pl-10" placeholder="搜索项目名称..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>预算编号</TableHead><TableHead>项目名称</TableHead><TableHead>合同名称</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {budgets.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-400">暂无预算数据</TableCell></TableRow> : budgets.map((b: { id: number; budgetNo: string; projectName: string; contractId: number }) => (
                <TableRow key={b.id}><TableCell className="font-mono text-sm">{b.budgetNo}</TableCell><TableCell className="font-medium">{b.projectName}</TableCell><TableCell>{b.contractId ? '#' + b.contractId : '-'}</TableCell><TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setViewingId(b.id); setViewDialogOpen(true); }}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { setViewingId(b.id); setTimeout(exportToExcel, 100); }}><FileDown className="w-4 h-4" /></Button>
                  </div>
                </TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>新增项目预算</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>合同名称</Label><Input value={form.contractId ? String(form.contractId) : ""} onChange={(e) => setForm({ ...form, contractId: Number(e.target.value) || 0 })} placeholder="输入合同编号或名称" /></div>
                <div className="space-y-2"><Label>项目名称</Label>
                  <Select value={form.projectName} onValueChange={(v) => setForm({ ...form, projectName: v })}>
                    <SelectTrigger><SelectValue placeholder="选择项目名称" /></SelectTrigger>
                    <SelectContent>{projects.map((p: { id: number; name: string }) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3"><TabsTrigger value="part1">一、材料清单</TabsTrigger><TabsTrigger value="part2">二、人工费用</TabsTrigger><TabsTrigger value="part3">三、其他费用</TabsTrigger></TabsList>
                <TabsContent value="part1" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">支持导入：材料名称、数量、不含税价格、材料成本、供应商</div>
                    <div className="flex gap-2">
                      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportMaterials} className="hidden" />
                      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4 mr-1" />导入材料</Button>
                      <Button variant="outline" size="sm" onClick={addMaterial}><Plus className="w-4 h-4 mr-1" />添加材料</Button>
                    </div>
                  </div>
                  {form.part1Materials.length === 0 ? <p className="text-center text-gray-400 py-4">暂无材料</p> : (
                    <div className="space-y-3">{form.part1Materials.map((m, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-3 rounded text-sm">
                        <div className="col-span-2 space-y-1"><Label className="text-xs">材料名称</Label><Input value={m.materialName} onChange={(e) => updateMaterial(i, "materialName", e.target.value)} /></div>
                        <div className="col-span-1 space-y-1"><Label className="text-xs">数量</Label><Input type="number" value={m.quantity} onChange={(e) => updateMaterial(i, "quantity", Number(e.target.value))} /></div>
                        <div className="col-span-1 space-y-1"><Label className="text-xs">含税价</Label><Input type="number" value={m.price} onChange={(e) => updateMaterial(i, "price", Number(e.target.value))} /></div>
                        <div className="col-span-1 space-y-1"><Label className="text-xs">不含税价</Label><Input type="number" value={m.exclTaxPrice} onChange={(e) => updateMaterial(i, "exclTaxPrice", Number(e.target.value))} /></div>
                        <div className="col-span-1 space-y-1"><Label className="text-xs">金额</Label><Input value={m.amount} readOnly className="bg-gray-100" /></div>
                        <div className="col-span-1 space-y-1"><Label className="text-xs">税率%</Label><Input type="number" value={m.taxRate} onChange={(e) => updateMaterial(i, "taxRate", Number(e.target.value))} /></div>
                        <div className="col-span-1 space-y-1"><Label className="text-xs">成本</Label><Input type="number" value={m.materialCost} onChange={(e) => updateMaterial(i, "materialCost", Number(e.target.value))} /></div>
                        <div className="col-span-2 space-y-1"><Label className="text-xs">供应商</Label><Input value={m.supplier} onChange={(e) => updateMaterial(i, "supplier", e.target.value)} /></div>
                        <div className="col-span-1 space-y-1"><Label className="text-xs">到货日期</Label><Input type="date" value={m.arrivalDate} onChange={(e) => updateMaterial(i, "arrivalDate", e.target.value)} /></div>
                        <div className="col-span-1"><Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeMaterial(i)}><Trash2 className="w-4 h-4" /></Button></div>
                      </div>
                    ))}</div>
                  )}
                </TabsContent>
                <TabsContent value="part2" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Object.entries(form.part2Labor).map(([key, value]) => (
                    <div key={key} className="space-y-2"><Label>{{ workshopFee: "车间制造费用", pmSalary: "项目经理工资补贴", staffSalary: "项目员工工资补贴", otherLabor: "其他人工费用" }[key]}</Label><Input type="number" value={value} onChange={(e) => setForm({ ...form, part2Labor: { ...form.part2Labor, [key]: Number(e.target.value) } })} /></div>
                  ))}</div>
                </TabsContent>
                <TabsContent value="part3" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Object.entries(form.part3Other).map(([key, value]) => (
                    <div key={key} className="space-y-2"><Label>{{ processingFee: "加工费用", fuelFee: "燃油费用", weldingFee: "焊接费用", transportFee: "运输费用", certFee: "认证费用", auditFee: "审计费用", otherFee: "其他费用" }[key]}</Label><Input type="number" value={value} onChange={(e) => setForm({ ...form, part3Other: { ...form.part3Other, [key]: Number(e.target.value) } })} /></div>
                  ))}</div>
                </TabsContent>
              </Tabs>
              <div className="space-y-2"><Label>差异原因分析</Label><Input value={form.budgetSummary.diffReason} onChange={(e) => setForm({ ...form, budgetSummary: { ...form.budgetSummary, diffReason: e.target.value } })} placeholder="输入差异原因分析" /></div>
              <div className="space-y-2"><Label>备注</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="输入备注信息" /></div>
              <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={handleSubmit} disabled={createMut.isPending}>保存预算</Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center justify-between"><span>预算详情</span><div className="flex gap-2"><Button variant="outline" size="sm" onClick={exportToExcel}><FileDown className="w-4 h-4 mr-1" />导出</Button><Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />打印</Button></div></DialogTitle></DialogHeader>
            {viewBudget && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm"><p><span className="text-gray-500">预算编号：</span>{(viewBudget as unknown as { budgetNo: string }).budgetNo}</p><p><span className="text-gray-500">项目名称：</span>{(viewBudget as unknown as { projectName: string }).projectName}</p></div>
                <div><h3 className="font-semibold mb-2">一、材料清单</h3><Table><TableHeader><TableRow><TableHead>材料名称</TableHead><TableHead>数量</TableHead><TableHead>含税价</TableHead><TableHead>不含税价</TableHead><TableHead>金额</TableHead><TableHead>税率</TableHead><TableHead>成本</TableHead><TableHead>供应商</TableHead><TableHead>到货日期</TableHead></TableRow></TableHeader><TableBody>{((viewBudget as unknown as { part1Materials: MaterialItem[] }).part1Materials || []).map((m: MaterialItem, i: number) => <TableRow key={i}><TableCell>{m.materialName}</TableCell><TableCell>{m.quantity}</TableCell><TableCell>¥{m.price}</TableCell><TableCell>¥{m.exclTaxPrice}</TableCell><TableCell>¥{m.amount}</TableCell><TableCell>{m.taxRate}%</TableCell><TableCell>¥{m.materialCost}</TableCell><TableCell>{m.supplier}</TableCell><TableCell>{m.arrivalDate}</TableCell></TableRow>)}</TableBody></Table></div>
                <div><h3 className="font-semibold mb-2">二、人工费用</h3><div className="grid grid-cols-2 gap-2 text-sm"><p>车间制造费用：¥{(viewBudget as unknown as { part2Labor: { workshopFee: number } }).part2Labor?.workshopFee || 0}</p><p>项目经理工资补贴：¥{(viewBudget as unknown as { part2Labor: { pmSalary: number } }).part2Labor?.pmSalary || 0}</p><p>项目员工工资补贴：¥{(viewBudget as unknown as { part2Labor: { staffSalary: number } }).part2Labor?.staffSalary || 0}</p><p>其他人工费用：¥{(viewBudget as unknown as { part2Labor: { otherLabor: number } }).part2Labor?.otherLabor || 0}</p></div></div>
                <div><h3 className="font-semibold mb-2">三、其他费用</h3><div className="grid grid-cols-2 gap-2 text-sm"><p>加工费用：¥{(viewBudget as unknown as { part3Other: { processingFee: number } }).part3Other?.processingFee || 0}</p><p>燃油费用：¥{(viewBudget as unknown as { part3Other: { fuelFee: number } }).part3Other?.fuelFee || 0}</p><p>焊接费用：¥{(viewBudget as unknown as { part3Other: { weldingFee: number } }).part3Other?.weldingFee || 0}</p><p>运输费用：¥{(viewBudget as unknown as { part3Other: { transportFee: number } }).part3Other?.transportFee || 0}</p><p>认证费用：¥{(viewBudget as unknown as { part3Other: { certFee: number } }).part3Other?.certFee || 0}</p><p>审计费用：¥{(viewBudget as unknown as { part3Other: { auditFee: number } }).part3Other?.auditFee || 0}</p><p>其他费用：¥{(viewBudget as unknown as { part3Other: { otherFee: number } }).part3Other?.otherFee || 0}</p></div></div>
                {(viewBudget as unknown as { budgetSummary: { budgetAmount: number; actualAmount: number; diffAmount: number; diffReason: string } }).budgetSummary && <div><h3 className="font-semibold mb-2">预算汇总</h3><div className="grid grid-cols-2 gap-2 text-sm"><p>预算金额：¥{(viewBudget as unknown as { budgetSummary: { budgetAmount: number } }).budgetSummary.budgetAmount}</p><p>实际金额：¥{(viewBudget as unknown as { budgetSummary: { actualAmount: number } }).budgetSummary.actualAmount}</p><p>差异金额：¥{(viewBudget as unknown as { budgetSummary: { diffAmount: number } }).budgetSummary.diffAmount}</p><p>差异原因：{(viewBudget as unknown as { budgetSummary: { diffReason: string } }).budgetSummary.diffReason || "-"}</p></div></div>}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
