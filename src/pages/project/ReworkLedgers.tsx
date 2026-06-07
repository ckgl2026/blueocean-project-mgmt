import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2, FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { trpc } from "@/providers/trpc";

const causeLabels: Record<string, string> = { design_error: "设计错误", client_change: "甲方变更", material_defect: "材料缺陷", construction_error: "施工错误", other: "其他" };
const causeColors: Record<string, string> = { design_error: "bg-red-100 text-red-700", client_change: "bg-blue-100 text-blue-700", material_defect: "bg-orange-100 text-orange-700", construction_error: "bg-purple-100 text-purple-700", other: "bg-gray-100 text-gray-700" };

export default function ReworkLedgers() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ projectName: "", reworkDate: new Date().toISOString().split("T")[0], reason: "", causeCategory: "other" as "design_error" | "client_change" | "material_defect" | "construction_error" | "other", reworkItem: "", quantity: 0, cost: 0, responsibleParty: "", solution: "", deadline: "" });
  const utils = trpc.useUtils();

  const { data: records = [] } = trpc.rework.list.useQuery({ search: search || undefined });
  const { data: projects = [] } = trpc.project.list.useQuery();
  const createMut = trpc.rework.create.useMutation({ onSuccess: () => { utils.rework.list.invalidate(); toast.success("记录创建成功"); } });
  const updateMut = trpc.rework.update.useMutation({ onSuccess: () => { utils.rework.list.invalidate(); toast.success("记录更新成功"); } });
  const deleteMut = trpc.rework.delete.useMutation({ onSuccess: () => { utils.rework.list.invalidate(); toast.success("删除成功"); } });

  const resetForm = () => setForm({ projectName: "", reworkDate: new Date().toISOString().split("T")[0], reason: "", causeCategory: "other", reworkItem: "", quantity: 0, cost: 0, responsibleParty: "", solution: "", deadline: "" });

  const handleSubmit = () => {
    if (!form.projectName || !form.reason || !form.reworkItem) { toast.error("请填写完整信息"); return; }
    if (editingId) { updateMut.mutate({ id: editingId, ...form, deadline: form.deadline || undefined }); }
    else { createMut.mutate({ ...form, deadline: form.deadline || undefined }); }
    setDialogOpen(false); resetForm(); setEditingId(null);
  };

  const exportToExcel = () => {
    if (!records.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["项目名称", "返工日期", "返工原因", "原因分类", "返工项", "数量", "费用", "责任方", "处理方案", "截止日期"], ...records.map((r: { projectName: string; reworkDate: Date | string; reason: string; causeCategory: string; reworkItem: string; quantity: string | number; cost: string | number; responsibleParty: string | null; solution: string | null; deadline: Date | string | null }) => [r.projectName, new Date(r.reworkDate).toLocaleDateString("zh-CN"), r.reason, causeLabels[r.causeCategory] || r.causeCategory, r.reworkItem, Number(r.quantity), Number(r.cost), r.responsibleParty || "", r.solution || "", r.deadline ? new Date(r.deadline).toLocaleDateString("zh-CN") : ""])]), "返工台账");
    XLSX.writeFile(wb, "项目返工台账.xlsx");
  };

  const handlePrint = () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const rows = records.map((r: { projectName: string; reworkDate: Date | string; reason: string; causeCategory: string; reworkItem: string; quantity: string | number; cost: string | number; responsibleParty: string | null; solution: string | null; deadline: Date | string | null }) => `<tr><td>${r.projectName}</td><td>${new Date(r.reworkDate).toLocaleDateString("zh-CN")}</td><td>${r.reason}</td><td>${causeLabels[r.causeCategory] || r.causeCategory}</td><td>${r.reworkItem}</td><td>${Number(r.quantity)}</td><td>${Number(r.cost).toFixed(2)}</td><td>${r.responsibleParty || ""}</td><td>${r.solution || ""}</td><td>${r.deadline ? new Date(r.deadline).toLocaleDateString("zh-CN") : ""}</td></tr>`).join("");
    pw.document.write(`<html><head><title>项目返工台账</title><style>body{font-family:SimSun,sans-serif;padding:40px}h1{text-align:center}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #333;padding:8px}th{background:#f5f5f5}</style></head><body><h1>项目返工台账</h1><table><tr><th>项目名称</th><th>返工日期</th><th>返工原因</th><th>原因分类</th><th>返工项</th><th>数量</th><th>费用</th><th>责任方</th><th>处理方案</th><th>截止日期</th></tr>${rows}</table></body></html>`);
    pw.document.close(); pw.print();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900">项目返工台账</h1><p className="text-gray-500 mt-1">记录项目返工情况</p></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel}><FileDown className="w-4 h-4 mr-1" />导出</Button>
            <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />打印</Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={() => { resetForm(); setEditingId(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />新增记录</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingId ? "编辑记录" : "新增返工记录"}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>项目名称</Label>
                    <Select value={form.projectName} onValueChange={(v) => setForm({ ...form, projectName: v })}>
                      <SelectTrigger><SelectValue placeholder="选择项目名称" /></SelectTrigger>
                      <SelectContent>{projects.map((p: { id: number; name: string }) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>返工日期</Label><Input type="date" value={form.reworkDate} onChange={(e) => setForm({ ...form, reworkDate: e.target.value })} /></div><div className="space-y-2"><Label>截止日期</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div></div>
                  <div className="space-y-2"><Label>返工原因</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="请输入返工原因" /></div>
                  <div className="space-y-2"><Label>原因分类</Label><Select value={form.causeCategory} onValueChange={(v) => setForm({ ...form, causeCategory: v as "design_error" | "client_change" | "material_defect" | "construction_error" | "other" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="design_error">设计错误</SelectItem><SelectItem value="client_change">甲方变更</SelectItem><SelectItem value="material_defect">材料缺陷</SelectItem><SelectItem value="construction_error">施工错误</SelectItem><SelectItem value="other">其他</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>返工项</Label><Input value={form.reworkItem} onChange={(e) => setForm({ ...form, reworkItem: e.target.value })} placeholder="返工内容" /></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>数量</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div><div className="space-y-2"><Label>费用</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} /></div></div>
                  <div className="space-y-2"><Label>责任方</Label><Input value={form.responsibleParty} onChange={(e) => setForm({ ...form, responsibleParty: e.target.value })} placeholder="责任方" /></div>
                  <div className="space-y-2"><Label>处理方案</Label><Input value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} placeholder="处理方案" /></div>
                  <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>保存</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input className="pl-10" placeholder="搜索项目名称..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>项目</TableHead><TableHead>返工日期</TableHead><TableHead>返工项</TableHead><TableHead>原因</TableHead><TableHead>数量</TableHead><TableHead>费用</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {records.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">暂无记录</TableCell></TableRow> : records.map((r: { id: number; projectName: string; reworkDate: Date | string; reworkItem: string; causeCategory: string; quantity: string | number; cost: string | number; reason: string; responsibleParty: string | null; solution: string | null; deadline: Date | string | null }) => (
                <TableRow key={r.id}><TableCell className="font-medium">{r.projectName}</TableCell><TableCell className="text-sm">{new Date(r.reworkDate).toLocaleDateString("zh-CN")}</TableCell><TableCell className="max-w-[150px] truncate">{r.reworkItem}</TableCell><TableCell><Badge className={causeColors[r.causeCategory]}>{causeLabels[r.causeCategory] || r.causeCategory}</Badge></TableCell><TableCell>{Number(r.quantity)}</TableCell><TableCell>¥{Number(r.cost).toFixed(2)}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => { setEditingId(r.id); setForm({ projectName: r.projectName, reworkDate: new Date(r.reworkDate).toISOString().split("T")[0], reason: r.reason, causeCategory: r.causeCategory as "design_error" | "client_change" | "material_defect" | "construction_error" | "other", reworkItem: r.reworkItem, quantity: Number(r.quantity), cost: Number(r.cost), responsibleParty: r.responsibleParty || "", solution: r.solution || "", deadline: r.deadline ? new Date(r.deadline).toISOString().split("T")[0] : "" }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { if (confirm("确定删除吗？")) deleteMut.mutate({ id: r.id }); }}><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
