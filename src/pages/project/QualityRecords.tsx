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

const resultLabels: Record<string, { label: string; color: string }> = {
  pass: { label: "合格", color: "bg-green-100 text-green-700 border-green-200" },
  fail: { label: "不合格", color: "bg-red-100 text-red-700 border-red-200" },
  pending: { label: "待检", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
};

export default function QualityRecords() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ projectName: "", recordDate: new Date().toISOString().split("T")[0], itemName: "", specification: "", checkMethod: "", checkResult: "pending" as "pass" | "fail" | "pending", inspector: "", remark: "" });
  const utils = trpc.useUtils();

  const { data: records = [] } = trpc.quality.list.useQuery({ search: search || undefined });
  const { data: projects = [] } = trpc.project.list.useQuery();
  const createMut = trpc.quality.create.useMutation({ onSuccess: () => { utils.quality.list.invalidate(); toast.success("记录创建成功"); } });
  const updateMut = trpc.quality.update.useMutation({ onSuccess: () => { utils.quality.list.invalidate(); toast.success("记录更新成功"); } });
  const deleteMut = trpc.quality.delete.useMutation({ onSuccess: () => { utils.quality.list.invalidate(); toast.success("删除成功"); } });

  const resetForm = () => setForm({ projectName: "", recordDate: new Date().toISOString().split("T")[0], itemName: "", specification: "", checkMethod: "", checkResult: "pending", inspector: "", remark: "" });

  const handleSubmit = () => {
    if (!form.projectName || !form.itemName) { toast.error("请填写项目名称和检查项目"); return; }
    if (editingId) { updateMut.mutate({ id: editingId, ...form }); }
    else { createMut.mutate(form); }
    setDialogOpen(false); resetForm(); setEditingId(null);
  };

  const exportToExcel = () => {
    if (!records.length) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["项目名称", "记录日期", "检查项目", "规格要求", "检查方法", "检查结果", "检查人", "备注"], ...records.map((r: { projectName: string; recordDate: Date | string; itemName: string; specification: string | null; checkMethod: string | null; checkResult: string; inspector: string | null; remark: string | null }) => [r.projectName, new Date(r.recordDate).toLocaleDateString("zh-CN"), r.itemName, r.specification || "", r.checkMethod || "", resultLabels[r.checkResult]?.label || r.checkResult, r.inspector || "", r.remark || ""])]), "质量记录");
    XLSX.writeFile(wb, "项目质量记录.xlsx");
  };

  const handlePrint = () => {
    const pw = window.open("", "_blank");
    if (!pw) return;
    const rows = records.map((r: { projectName: string; recordDate: Date | string; itemName: string; specification: string | null; checkMethod: string | null; checkResult: string; inspector: string | null; remark: string | null }) => `<tr><td>${r.projectName}</td><td>${new Date(r.recordDate).toLocaleDateString("zh-CN")}</td><td>${r.itemName}</td><td>${r.specification || ""}</td><td>${r.checkMethod || ""}</td><td>${resultLabels[r.checkResult]?.label || r.checkResult}</td><td>${r.inspector || ""}</td><td>${r.remark || ""}</td></tr>`).join("");
    pw.document.write(`<html><head><title>项目质量记录</title><style>body{font-family:SimSun,sans-serif;padding:40px}h1{text-align:center}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #333;padding:8px}th{background:#f5f5f5}</style></head><body><h1>项目质量记录</h1><table><tr><th>项目名称</th><th>记录日期</th><th>检查项目</th><th>规格要求</th><th>检查方法</th><th>检查结果</th><th>检查人</th><th>备注</th></tr>${rows}</table></body></html>`);
    pw.document.close(); pw.print();
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900">项目质量记录</h1><p className="text-gray-500 mt-1">记录项目质量检查情况</p></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToExcel}><FileDown className="w-4 h-4 mr-1" />导出</Button>
            <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />打印</Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={() => { resetForm(); setEditingId(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />新增记录</Button></DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingId ? "编辑记录" : "新增质量记录"}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>项目名称</Label>
                    <Select value={form.projectName} onValueChange={(v) => setForm({ ...form, projectName: v })}>
                      <SelectTrigger><SelectValue placeholder="选择项目名称" /></SelectTrigger>
                      <SelectContent>{projects.map((p: { id: number; name: string }) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>记录日期</Label><Input type="date" value={form.recordDate} onChange={(e) => setForm({ ...form, recordDate: e.target.value })} /></div>
                  <div className="space-y-2"><Label>检查项目</Label><Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} placeholder="请输入检查项目" /></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>规格要求</Label><Input value={form.specification} onChange={(e) => setForm({ ...form, specification: e.target.value })} placeholder="规格要求" /></div><div className="space-y-2"><Label>检查方法</Label><Input value={form.checkMethod} onChange={(e) => setForm({ ...form, checkMethod: e.target.value })} placeholder="检查方法" /></div></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>检查结果</Label><Select value={form.checkResult} onValueChange={(v) => setForm({ ...form, checkResult: v as "pass" | "fail" | "pending" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pass">合格</SelectItem><SelectItem value="fail">不合格</SelectItem><SelectItem value="pending">待检</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label>检查人</Label><Input value={form.inspector} onChange={(e) => setForm({ ...form, inspector: e.target.value })} placeholder="检查人姓名" /></div>
                  </div>
                  <div className="space-y-2"><Label>备注</Label><Input value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="备注信息" /></div>
                  <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>保存</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input className="pl-10" placeholder="搜索项目名称或检查项目..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>项目名称</TableHead><TableHead>记录日期</TableHead><TableHead>检查项目</TableHead><TableHead>检查结果</TableHead><TableHead>检查人</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {records.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">暂无记录</TableCell></TableRow> : records.map((r: { id: number; projectName: string; recordDate: Date | string; itemName: string; checkResult: string; inspector: string | null; specification: string | null; checkMethod: string | null; remark: string | null }) => (
                <TableRow key={r.id}><TableCell className="font-medium">{r.projectName}</TableCell><TableCell className="text-sm">{new Date(r.recordDate).toLocaleDateString("zh-CN")}</TableCell><TableCell>{r.itemName}</TableCell><TableCell><Badge variant="outline" className={resultLabels[r.checkResult]?.color}>{resultLabels[r.checkResult]?.label}</Badge></TableCell><TableCell>{r.inspector || "-"}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => { setEditingId(r.id); setForm({ projectName: r.projectName, recordDate: new Date(r.recordDate).toISOString().split("T")[0], itemName: r.itemName, specification: r.specification || "", checkMethod: r.checkMethod || "", checkResult: r.checkResult as "pass" | "fail" | "pending", inspector: r.inspector || "", remark: r.remark || "" }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { if (confirm("确定删除吗？")) deleteMut.mutate({ id: r.id }); }}><Trash2 className="w-4 h-4" /></Button></div></TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
