import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Pencil, Trash2, UserPlus, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

const roleLabels: Record<string, string> = {
  super_admin: "超级管理员", contract_admin: "合同管理员", project_manager: "项目经理人",
};
const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700 border-red-200",
  contract_admin: "bg-blue-100 text-blue-700 border-blue-200",
  project_manager: "bg-green-100 text-green-700 border-green-200",
};

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ username: "", name: "", password: "", role: "contract_admin" as "contract_admin" | "project_manager", status: "active" as "active" | "inactive" });
  const [pwdForm, setPwdForm] = useState({ oldPassword: " ", newPassword: "", confirmPassword: "" });
  const utils = trpc.useUtils();

  const { data: users = [] } = trpc.user.list.useQuery({ search });
  const createUser = trpc.user.create.useMutation({ onSuccess: () => { utils.user.list.invalidate(); toast.success("用户创建成功"); } });
  const updateUserMut = trpc.user.update.useMutation({ onSuccess: () => { utils.user.list.invalidate(); toast.success("用户更新成功"); } });
  const deleteUserMut = trpc.user.delete.useMutation({ onSuccess: () => { utils.user.list.invalidate(); toast.success("删除成功"); } });
  const changePassword = trpc.localAuth.changePassword.useMutation({
    onSuccess: () => { toast.success("密码修改成功，请重新登录"); setPwdDialogOpen(false); setPwdForm({ oldPassword: " ", newPassword: "", confirmPassword: "" }); },
    onError: (err) => { toast.error(err.message); },
  });

  const filteredUsers = users.filter((u: { role: string }) => u.role !== "super_admin");

  const resetForm = () => {
    setForm({ username: "", name: "", password: "", role: "contract_admin", status: "active" });
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!form.username || !form.name) { toast.error("请填写用户名和姓名"); return; }
    if (editingId) {
      const data: { name: string; role: "contract_admin" | "project_manager"; status: "active" | "inactive"; password?: string } = { name: form.name, role: form.role, status: form.status };
      if (form.password) data.password = form.password;
      updateUserMut.mutate({ id: editingId, ...data });
    } else {
      createUser.mutate({ username: form.username, name: form.name, password: form.password || " ", role: form.role, status: form.status });
    }
    setDialogOpen(false);
    resetForm();
  };

  const handlePwdSubmit = () => {
    if (!pwdForm.newPassword || pwdForm.newPassword.length < 1) { toast.error("请输入新密码"); return; }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast.error("两次输入的新密码不一致"); return; }
    changePassword.mutate({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
            <p className="text-gray-500 mt-1">管理系统用户，包括合同管理员和项目经理人</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPwdDialogOpen(true)}><KeyRound className="w-4 h-4 mr-1" />修改密码</Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={() => { resetForm(); setDialogOpen(true); }}>
                  <UserPlus className="w-4 h-4 mr-2" />新增用户
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingId ? "编辑用户" : "新增用户"}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2"><Label>用户名</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="请输入用户名" disabled={!!editingId} /></div>
                  <div className="space-y-2"><Label>姓名</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入姓名" /></div>
                  <div className="space-y-2"><Label>{editingId ? "新密码（不修改请留空）" : "密码（留空则为空格）"}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editingId ? "不修改请留空" : "留空则密码为空格"} /></div>
                  <div className="space-y-2"><Label>角色</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "contract_admin" | "project_manager" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="contract_admin">合同管理员</SelectItem><SelectItem value="project_manager">项目经理人</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>状态</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as "active" | "inactive" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">启用</SelectItem><SelectItem value="inactive">停用</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={handleSubmit} disabled={createUser.isPending || updateUserMut.isPending}>保存</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-10" placeholder="搜索用户名或姓名..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>用户名</TableHead><TableHead>姓名</TableHead><TableHead>角色</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">暂无用户数据</TableCell></TableRow>
              ) : filteredUsers.map((user: { id: number; username: string; name: string; role: string; status: string }) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell><Badge variant="outline" className={roleColors[user.role]}>{roleLabels[user.role]}</Badge></TableCell>
                  <TableCell><Badge variant={user.status === "active" ? "default" : "secondary"} className={user.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-gray-100 text-gray-600 hover:bg-gray-100"}>{user.status === "active" ? "启用" : "停用"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(user.id); setForm({ username: user.username, name: user.name, password: "", role: user.role as "contract_admin" | "project_manager", status: user.status as "active" | "inactive" }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { if (confirm("确定删除此用户吗？")) deleteUserMut.mutate({ id: user.id }); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Password Change Dialog */}
        <Dialog open={pwdDialogOpen} onOpenChange={setPwdDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>修改密码</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2"><Label>原密码</Label><Input type="password" value={pwdForm.oldPassword} onChange={(e) => setPwdForm({ ...pwdForm, oldPassword: e.target.value })} placeholder="原密码（空格则按空格键）" /></div>
              <div className="space-y-2"><Label>新密码</Label><Input type="password" value={pwdForm.newPassword} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} placeholder="请输入新密码" /></div>
              <div className="space-y-2"><Label>确认新密码</Label><Input type="password" value={pwdForm.confirmPassword} onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} placeholder="请再次输入新密码" /></div>
              <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={handlePwdSubmit} disabled={changePassword.isPending}>确认修改</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
