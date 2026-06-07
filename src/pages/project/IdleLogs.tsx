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

const causeLabels: Record<string, string> = { material_delay: "材料延误", drawing_incomplete: "图纸不全", site_not_ready: "现场不具备", other: "其他" };
const causeColors: Record<string, string> = { material_delay: "bg-orange-100 text-orange-700", drawing_incomplete: "bg-blue-100 text-blue-700", site_not_ready: "bg-purple-100 text-purple-700", other: "bg-gray-100 text-gray-700" };

export default function IdleLogs() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ projectName: "", idleDate: new Date().toISOString().split("T")[0], reason: "", causeCategory: "other" as "material_delay" | "drawing_incomplete" | "site_not_ready" | "other", peopleDays: 0, directCost: 0, scheduleImpact: "" });
  const utils = trpc.useUtils();

  const { data: logs = [] } = trpc.idleLog.list.useQuery({ search: search || undefined });
  const { data: projects = [] } = trpc.project.list.useQuery();
  const createMut = trpc.idleLog.create.useMutation({ onSuccess: () => { utils.idleLog.list.invalidate(); toast.success("记录创建成功"); } });
  const updateMut = trpc.idleLog.update.useMutation({ onSuccess: () => { utils.idleLog.list.invalidate(); toast.success("记录更新成功"); } });
  const deleteMut = trpc.idleLog.delete.useMutation({ onSuccess: () => { utils.idleLog.list.invalidate(); toast.success("删除成功"); } });

  const resetForm = () => setForm({ projectName: "", idleDate: new Date().toISOString().split("T")[0], reason: "", causeCategory: "other", peopleDays: 0, directCost: 0, scheduleImpact: "" });

  const handleSubmit = () => {
    if (!form.projectName || !form.reason) { toast.error("请填写完整信息"); return; }
    if (editingId) { updateMut.mutate({ id: editingId, ...form }); }
    else { createMut.mutate(form); }
    setDialogOpen(false); resetForm(); setEditingId(null);
  };

  const exportToExcel = () => {
    if (!logs.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["项目名称", "窝工日期", "窝工原因", "原因分类", "人工量(人日)", "直接费用", "进度影响"], ...logs.map((l: { projectName: string; idleDate: Date | string; reason: string; causeCategory: string; peopleDays: string | number; directCost: string | number; scheduleImpact: string | null }) => [l.projectName, new Date(l.idleDate).toLocaleDateString("zh-CN"), l.reason, causeLabels[l.causeCategory] || l.causeCategory, Number(l.peopleDays), Number(l.directCost), l.scheduleImpact || ""])]), "窝工日志");
    XLSX.writeFile(wb, "项目窝工日志.xlsx");
  };

  const handlePrint = () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const rows = logs.map((l: { projectName: string; idleDate: Date | string; reason: string; causeCategory: string; peopleDays: string | number; directCost: string | number; scheduleImpact: string | null }) => `<tr><td>${l.projectName}</td><td>${new Date(l.idleDate).toLocaleDateString("zh-CN")}</td><td>${l.reason}</td><td>${causeLabels[l.causeCategory] || l.causeCategory}</td><td>${Number(l.peopleDays)}</td><td>${Number(l.directCost).toFixed(2)}</td><td>${l.scheduleImpact || ""}</td></tr>`).join("");
    pw.document.write(`<html><head><title>项目窝工日志</title><style>body{font-family:SimSun,sans-serif;padding:40px}h1{text-align:center}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #333;padding:8px}th{background:#f5f5f5}</style></head><body><h1>项目窝工日志</h1><table><tr><th>项目名称</th><th>窝工日期</th><th>窝工原因</th><th>原因分类</th><th>人工量(人日)</th><th>直接费用</th><th>进度影响</th></tr>${rows}</table></body></html>`);
    pw.document.close(); pw.print();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900">项目窝工日志</h1><p className="text-gray-500 mt-1">记录项目窝工情况</p></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel}><FileDown className="w-4 h-4 mr-1" />导出</Button>
            <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />打印</Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={() => { resetForm(); setEditingId(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />新增记录</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingId ? "编辑记录" : "新增窝工记录"}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>项目名称</Label>
                    <Select value={form.projectName} onValueChange={(v) => setForm({ ...form, projectName: v })}>
                      <SelectTrigger><SelectValue placeholder="选择项目名称" /></SelectTrigger>
                      <SelectContent>{projects.map((p: { id: number; name: string }) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>窝工日期</Label><Input type="date" value={form.idleDate} onChange={(e) => setForm({ ...form, idleDate: e.target.value })} /></div>
                  <div className="space-y-2"><Label>窝工原因</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="请输入窝工原因" /></div>
                  <div className="space-y-2"><Label>原因分类</Label><Select value={form.causeCategory} onValueChange={(v) => setForm({ ...form, causeCategory: v as "material_delay" | "drawing_incomplete" | "site_not_ready" | "other" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="material_delay">材料延误</SelectItem><SelectItem value="drawing_incomplete">图纸不全</SelectItem><SelectItem value="site_not_ready">现场不具备</SelectItem><SelectItem value="other">其他</SelectItem></SelectContent></Select></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>人工量（人日）</Label><Input type="number" value={form.peopleDays} onChange={(e) => setForm({ ...form, peopleDays: Number(e.target.value) })} /></div><div className="space-y-2"><Label>直接费用</Label><Input type="number" value={form.directCost} onChange={(e) => setForm({ ...form, directCost: Number(e.target.value) })} /></div></div>
                  <div className="space-y-2"><Label>进度影响</Label><Input value={form.scheduleImpact} onChange={(e) => setForm({ ...form, scheduleImpact: e.target.value })} placeholder="对项目进度的影响" /></div>
                  <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>保存</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input className="pl-10" placeholder="搜索项目名称..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>项目名称</TableHead><TableHead>窝工日期</TableHead><TableHead>窝工原因</TableHead><TableHead>原因分类</TableHead><TableHead>人日</TableHead><TableHead>费用</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">暂无记录</TableCell></TableRow> : logs.map((l: { id: number; projectName: string; idleDate: Date | string; reason: string; causeCategory: string; peopleDays: string | number; directCost: string | number; scheduleImpact: string | null }) => (
                <TableRow key={l.id}><TableCell className="font-medium">{l.projectName}</TableCell><TableCell className="text-sm">{new Date(l.idleDate).toLocaleDateString("zh-CN")}</TableCell><TableCell className="max-w-[200px] truncate">{l.reason}</TableCell><TableCell><Badge className={causeColors[l.causeCategory]}>{causeLabels[l.causeCategory] || l.causeCategory}</Badge></TableCell><TableCell>{Number(l.peopleDays)}</TableCell><TableCell>¥{Number(l.directCost).toFixed(2)}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => { setEditingId(l.id); setForm({ projectName: l.projectName, idleDate: new Date(l.idleDate).toISOString().split("T")[0], reason: l.reason, causeCategory: l.causeCategory as "material_delay" | "drawing_incomplete" | "site_not_ready" | "other", peopleDays: Number(l.peopleDays), directCost: Number(l.directCost), scheduleImpact: l.scheduleImpact || "" }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { if (confirm("确定删除吗？")) deleteMut.mutate({ id: l.id }); }}><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
