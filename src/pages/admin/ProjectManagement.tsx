import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

const statusLabels: Record<string, string> = { active: "进行中", completed: "已完成", archived: "已归档" };
const statusColors: Record<string, string> = { active: "bg-green-100 text-green-700 border-green-200", completed: "bg-blue-100 text-blue-700 border-blue-200", archived: "bg-gray-100 text-gray-700 border-gray-200" };

export default function ProjectManagement() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", status: "active" as "active" | "completed" | "archived" });
  const utils = trpc.useUtils();

  const { data: projects = [] } = trpc.project.list.useQuery({ search: search || undefined });
  const createMut = trpc.project.create.useMutation({ onSuccess: () => { utils.project.list.invalidate(); toast.success("项目创建成功"); } });
  const updateMut = trpc.project.update.useMutation({ onSuccess: () => { utils.project.list.invalidate(); toast.success("项目更新成功"); } });
  const deleteMut = trpc.project.delete.useMutation({ onSuccess: () => { utils.project.list.invalidate(); toast.success("删除成功"); } });

  const resetForm = () => setForm({ name: "", description: "", status: "active" });

  const handleSubmit = () => {
    if (!form.name) { toast.error("请输入项目名称"); return; }
    if (editingId) { updateMut.mutate({ id: editingId, ...form }); }
    else { createMut.mutate(form); }
    setDialogOpen(false); resetForm(); setEditingId(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">项目管理</h1>
            <p className="text-gray-500 mt-1">设置项目名称，供各业务模块下拉选择使用</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={() => { resetForm(); setEditingId(null); setDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />新增项目
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editingId ? "编辑项目" : "新增项目"}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2"><Label>项目名称</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入项目名称" /></div>
                <div className="space-y-2"><Label>项目描述</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="项目描述（可选）" /></div>
                <div className="space-y-2"><Label>状态</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "completed" | "archived" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">进行中</SelectItem><SelectItem value="completed">已完成</SelectItem><SelectItem value="archived">已归档</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>保存</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-10" placeholder="搜索项目名称..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>项目名称</TableHead><TableHead>描述</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-gray-400">暂无项目数据，请先添加项目</TableCell></TableRow>
              ) : projects.map((p: { id: number; name: string; description: string | null; status: string }) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-gray-500">{p.description || "-"}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColors[p.status]}>{statusLabels[p.status] || p.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(p.id); setForm({ name: p.name, description: p.description || "", status: p.status as "active" | "completed" | "archived" }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { if (confirm("确定删除此项目吗？")) deleteMut.mutate({ id: p.id }); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
