import { useAuth } from "@/hooks/useAuth";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText, Users, CheckCircle, Clock, RotateCcw,
  BarChart3, TrendingUp, AlertTriangle, LogIn,
} from "lucide-react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";

export default function Home() {
  const { isSuperAdmin, isContractAdmin, isProjectManager, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { data: contracts = [] } = trpc.contract.list.useQuery(undefined, { enabled: isContractAdmin });
  const { data: usersList = [] } = trpc.user.list.useQuery(undefined, { enabled: isSuperAdmin });
  const { data: qualityRecords = [] } = trpc.quality.list.useQuery(undefined, { enabled: isProjectManager });
  const { data: idleLogs = [] } = trpc.idleLog.list.useQuery(undefined, { enabled: isProjectManager });
  const { data: reworkRecords = [] } = trpc.rework.list.useQuery(undefined, { enabled: isProjectManager });

  const contractStats = {
    total: contracts.length,
    signed: contracts.filter((c: { status: string }) => c.status === "signed").length,
    executing: contracts.filter((c: { status: string }) => c.status === "executing").length,
    completed: contracts.filter((c: { status: string }) => c.status === "completed").length,
  };

  const NavButton = ({ to, icon: Icon, label, colorClass }: { to: string; icon: React.ElementType; label: string; colorClass: string }) => (
    <button
      onClick={() => navigate(to)}
      className="flex items-center w-full p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left active:bg-blue-100"
    >
      <Icon className={`w-5 h-5 mr-3 flex-shrink-0 ${colorClass}`} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  return (
    <MainLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">欢迎使用全流程项目管理系统</h1>
          <p className="text-gray-500 mt-1 text-sm sm:text-base">基于蓝海公司"质量-成本到人"项目核算制度</p>
        </div>

        {isContractAdmin && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-gray-500">合同总数</p><p className="text-xl sm:text-2xl font-bold mt-1">{contractStats.total}</p></div><div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-lg flex items-center justify-center"><FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" /></div></div></CardContent></Card>
            <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-gray-500">签约中</p><p className="text-xl sm:text-2xl font-bold mt-1">{contractStats.signed}</p></div><div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-50 rounded-lg flex items-center justify-center"><BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" /></div></div></CardContent></Card>
            <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-gray-500">执行中</p><p className="text-xl sm:text-2xl font-bold mt-1">{contractStats.executing}</p></div><div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" /></div></div></CardContent></Card>
            <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-gray-500">已完成</p><p className="text-xl sm:text-2xl font-bold mt-1">{contractStats.completed}</p></div><div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" /></div></div></CardContent></Card>
          </div>
        )}

        {isSuperAdmin && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base sm:text-lg flex items-center gap-2"><Users className="w-4 h-4 sm:w-5 sm:h-5" />人员概况</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg"><p className="text-xl sm:text-2xl font-bold text-red-700">{usersList.filter((u: { role: string }) => u.role === "super_admin").length}</p><p className="text-xs sm:text-sm text-red-600 mt-1">管理员</p></div>
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg"><p className="text-xl sm:text-2xl font-bold text-blue-700">{usersList.filter((u: { role: string }) => u.role === "contract_admin").length}</p><p className="text-xs sm:text-sm text-blue-600 mt-1">合同员</p></div>
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg"><p className="text-xl sm:text-2xl font-bold text-green-700">{usersList.filter((u: { role: string }) => u.role === "project_manager").length}</p><p className="text-xs sm:text-sm text-green-600 mt-1">经理人</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {isProjectManager && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-gray-500">质量记录</p><p className="text-xl sm:text-2xl font-bold mt-1">{qualityRecords.length}</p></div><div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" /></div></div></CardContent></Card>
            <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-gray-500">窝工日志</p><p className="text-xl sm:text-2xl font-bold mt-1">{idleLogs.length}</p></div><div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" /></div></div></CardContent></Card>
            <Card><CardContent className="p-4 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm text-gray-500">返工台账</p><p className="text-xl sm:text-2xl font-bold mt-1">{reworkRecords.length}</p></div><div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-lg flex items-center justify-center"><RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" /></div></div></CardContent></Card>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base sm:text-lg">快速导航</CardTitle></CardHeader>
          <CardContent>
            {!isAuthenticated ? (
              <div className="text-center py-6">
                <p className="text-gray-400 mb-3">请先登录后使用系统功能</p>
                <Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={() => navigate("/login")}>
                  <LogIn className="w-4 h-4 mr-2" />去登录
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {isSuperAdmin && <NavButton to="/users" icon={Users} label="用户管理" colorClass="text-blue-600" />}
                {isContractAdmin && <NavButton to="/contracts" icon={FileText} label="合同管理" colorClass="text-blue-600" />}
                {isContractAdmin && <NavButton to="/templates" icon={BarChart3} label="合同模板" colorClass="text-blue-600" />}
                {isSuperAdmin && <NavButton to="/projects" icon={TrendingUp} label="项目管理" colorClass="text-blue-600" />}
                {isSuperAdmin && <NavButton to="/budgets" icon={BarChart3} label="项目预算" colorClass="text-blue-600" />}
                {isProjectManager && <NavButton to="/quality" icon={CheckCircle} label="质量记录" colorClass="text-green-600" />}
                {isProjectManager && <NavButton to="/idle-logs" icon={Clock} label="窝工日志" colorClass="text-orange-600" />}
                {isProjectManager && <NavButton to="/rework" icon={RotateCcw} label="返工台账" colorClass="text-red-600" />}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1e3a5f] text-white">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2 text-sm sm:text-base">"质量-成本到人"核算制度要点</h3>
                <ul className="text-xs sm:text-sm text-white/80 space-y-1 list-disc list-inside">
                  <li>项目经理对项目质量和实际毛利率负责</li>
                  <li>每月核算在建项目的质量-成本情况</li>
                  <li>窝工率和返工率纳入项目经理绩效考核</li>
                  <li>目标：窝工率降低50%，返工率降低60%，毛利率提升至20%以上</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
