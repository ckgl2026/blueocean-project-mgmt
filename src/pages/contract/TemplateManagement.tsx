import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

export default function TemplateManagement() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", content: "" });
  const utils = trpc.useUtils();

  const { data: templates = [] } = trpc.contractTemplate.list.useQuery({ search: search || undefined });
  const createMut = trpc.contractTemplate.create.useMutation({ onSuccess: () => { utils.contractTemplate.list.invalidate(); toast.success("模板创建成功"); } });
  const updateMut = trpc.contractTemplate.update.useMutation({ onSuccess: () => { utils.contractTemplate.list.invalidate(); toast.success("模板更新成功"); } });
  const deleteMut = trpc.contractTemplate.delete.useMutation({ onSuccess: () => { utils.contractTemplate.list.invalidate(); toast.success("删除成功"); } });

  const resetForm = () => setForm({ name: "", description: "", content: "" });

  const handleSubmit = () => {
    if (!form.name || !form.content) { toast.error("请填写模板名称和内容"); return; }
    if (editingId) { updateMut.mutate({ id: editingId, ...form }); }
    else { createMut.mutate(form); }
    setDialogOpen(false); resetForm(); setEditingId(null);
  };

  const viewingTemplate = templates.find((t: { id: number }) => t.id === editingId && viewDialogOpen);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900">合同模板管理</h1><p className="text-gray-500 mt-1">管理合同模板，用于快速创建合同</p></div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={() => { resetForm(); setEditingId(null); setDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />新增模板
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingId ? "编辑模板" : "新增合同模板"}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2"><Label>模板名称</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入模板名称" /></div>
                <div className="space-y-2"><Label>模板描述</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="简短描述模板用途" /></div>
                <div className="space-y-2"><Label>模板内容（HTML，支持占位符：&123;&123;contractName&125;&125;等）</Label>
                  <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="输入HTML格式的合同模板内容" className="min-h-[300px] font-mono text-sm" /></div>
                <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>保存</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-10" placeholder="搜索模板名称..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>模板名称</TableHead><TableHead>描述</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-gray-400">暂无模板数据</TableCell></TableRow>
              ) : templates.map((t: { id: number; name: string; description: string | null; content: string }) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-gray-500">{t.description || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(t.id); setViewDialogOpen(true); }}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(t.id); setForm({ name: t.name, description: t.description || "", content: t.content }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { if (confirm("确定删除此模板吗？")) deleteMut.mutate({ id: t.id }); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>模板预览</DialogTitle></DialogHeader>
            {viewingTemplate && <div className="mt-4 border rounded-lg p-4 overflow-auto" dangerouslySetInnerHTML={{ __html: (viewingTemplate as unknown as { content: string }).content }} />}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
