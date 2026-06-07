import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Users, FileText, BookOpen, BarChart3, Menu, X, LogOut,
  ChevronRight, Home, RotateCcw, CheckCircle, Clock, Briefcase,
  TrendingUp, KeyRound,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

const menuItems = [
  { path: "/", label: "首页", icon: Home, roles: ["super_admin", "contract_admin", "project_manager"] },
  { path: "/users", label: "用户", icon: Users, roles: ["super_admin"] },
  { path: "/projects", label: "项目", icon: TrendingUp, roles: ["super_admin"] },
  { path: "/templates", label: "模板", icon: BookOpen, roles: ["super_admin", "contract_admin"] },
  { path: "/contracts", label: "合同", icon: FileText, roles: ["super_admin", "contract_admin"] },
  { path: "/budgets", label: "预算", icon: BarChart3, roles: ["super_admin"] },
  { path: "/quality", label: "质量", icon: CheckCircle, roles: ["super_admin", "project_manager"] },
  { path: "/idle-logs", label: "窝工", icon: Clock, roles: ["super_admin", "project_manager"] },
  { path: "/rework", label: "返工", icon: RotateCcw, roles: ["super_admin", "project_manager"] },
];

const roleLabels: Record<string, string> = {
  super_admin: "管理员",
  contract_admin: "合同员",
  project_manager: "经理人",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-red-100 text-red-700",
  contract_admin: "bg-blue-100 text-blue-700",
  project_manager: "bg-green-100 text-green-700",
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isSuperAdmin, isContractAdmin, isProjectManager } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: " ", newPassword: "", confirmPassword: "" });

  const changePassword = trpc.localAuth.changePassword.useMutation({
    onSuccess: () => { toast.success("密码修改成功，请重新登录"); setPwdDialogOpen(false); setPwdForm({ oldPassword: " ", newPassword: "", confirmPassword: "" }); },
    onError: (err) => { toast.error(err.message); },
  });

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handlePwdSubmit = () => {
    if (!pwdForm.newPassword) { toast.error("请输入新密码"); return; }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) { toast.error("两次输入的新密码不一致"); return; }
    changePassword.mutate({ oldPassword: pwdForm.oldPassword, newPassword: pwdForm.newPassword });
  };

  const filteredMenu = menuItems.filter((item) => {
    if (isSuperAdmin) return true;
    if (isContractAdmin && item.roles.includes("contract_admin")) return true;
    if (isProjectManager && item.roles.includes("project_manager")) return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-[#1e3a5f] text-white flex flex-col z-50 transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-14 flex items-center px-4 border-b border-white/10 flex-shrink-0">
          <Briefcase className="w-5 h-5 mr-2 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xs font-bold truncate">蓝海公司</h1>
            <p className="text-[9px] text-white/60 truncate">全流程项目管理</p>
          </div>
          <button className="lg:hidden ml-2 p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {filteredMenu.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={cn(
                "flex items-center px-3 py-2 rounded-lg text-sm transition-colors",
                isActive ? "bg-white/15 text-white font-medium" : "text-white/70 hover:bg-white/10 hover:text-white"
              )}>
                <Icon className="w-5 h-5" />
                <span className="ml-2">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3 flex-shrink-0">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0) || "?"}
            </div>
            <div className="ml-2 flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user?.name}</p>
              <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium", roleColors[user?.role || ""])}>
                {roleLabels[user?.role || ""]}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full text-white/70 hover:text-white hover:bg-white/10 justify-start h-8 text-xs mb-1" onClick={() => setPwdDialogOpen(true)}>
            <KeyRound className="w-3.5 h-3.5 mr-1.5" />修改密码
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-white/70 hover:text-white hover:bg-white/10 justify-start h-8 text-xs" onClick={logout}>
            <LogOut className="w-3.5 h-3.5 mr-1.5" />退出
          </Button>
        </div>
      </aside>

      <div className="lg:ml-64 flex flex-col min-h-screen">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-3 flex-shrink-0">
          <button className="lg:hidden mr-3 p-1" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0" />
          <span className="text-xs text-gray-600 truncate">{user?.name}</span>
        </header>

        <main className="flex-1 p-3 lg:p-6" style={{ paddingBottom: "80px" }}>
          {children}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around h-16 lg:hidden">
        {filteredMenu.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} className={cn(
              "flex flex-col items-center justify-center gap-0.5 w-full h-full",
              isActive ? "text-[#1e3a5f]" : "text-gray-400"
            )}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>

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
  );
}
