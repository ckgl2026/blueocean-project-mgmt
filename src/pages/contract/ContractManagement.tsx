import { useState } from "react";
import { useNavigate } from "react-router";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Trash2, Eye, Printer } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";

const statusLabels: Record<string, string> = { signed: "签约", executing: "执行", completed: "完成" };
const statusColors: Record<string, string> = { signed: "bg-blue-100 text-blue-700 border-blue-200", executing: "bg-yellow-100 text-yellow-700 border-yellow-200", completed: "bg-green-100 text-green-700 border-green-200" };

export default function ContractManagement() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: contracts = [] } = trpc.contract.list.useQuery({ search: search || undefined, status: statusFilter || undefined });
  const { data: templates = [] } = trpc.contractTemplate.list.useQuery();
  const deleteMut = trpc.contract.delete.useMutation({ onSuccess: () => { utils.contract.list.invalidate(); toast.success("删除成功"); } });

  const viewingContract = contracts.find((c: { id: number }) => c.id === viewingId) || null;

  const handlePrint = () => {
    if (!viewingContract) return;
    const tmpl = templates.find((t: { id: number | null }) => t.id === viewingContract.templateId);
    let html = viewingContract.content || tmpl?.content || "";
    const paymentScheduleHtml = (viewingContract.paymentSchedule || [])
      .map((p: { date: string; amount: number; note: string }) => `<tr><td style="border:1px solid #333;padding:8px">${p.date}</td><td style="border:1px solid #333;padding:8px;text-align:right">${Number(p.amount).toFixed(2)}</td><td style="border:1px solid #333;padding:8px">${p.note}</td></tr>`)
      .join("");
    html = html
      .replace(/\{\{contractName\}\}/g, viewingContract.name)
      .replace(/\{\{contractNo\}\}/g, viewingContract.contractNo)
      .replace(/\{\{partyB\}\}/g, viewingContract.partyB)
      .replace(/\{\{contractDate\}\}/g, new Date(viewingContract.contractDate).toLocaleDateString("zh-CN"))
      .replace(/\{\{projectName\}\}/g, viewingContract.projectName)
      .replace(/\{\{productName\}\}/g, viewingContract.productName)
      .replace(/\{\{quantity\}\}/g, String(viewingContract.quantity))
      .replace(/\{\{taxPrice\}\}/g, Number(viewingContract.taxPrice).toFixed(2))
      .replace(/\{\{taxAmount\}\}/g, Number(viewingContract.taxAmount).toFixed(2))
      .replace(/\{\{taxRate\}\}/g, String(viewingContract.taxRate))
      .replace(/\{\{invoiceType\}\}/g, viewingContract.invoiceType)
      .replace(/\{\{paymentSchedule\}\}/g, `<table style="width:100%;border-collapse:collapse"><tr style="background:#f5f5f5"><th style="border:1px solid #333;padding:8px">日期</th><th style="border:1px solid #333;padding:8px">金额(元)</th><th style="border:1px solid #333;padding:8px">备注</th></tr>${paymentScheduleHtml}</table>`);
    const pw = window.open("", "_blank");
    if (pw) { pw.document.write(html); pw.document.close(); pw.print(); }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900">合同管理</h1><p className="text-gray-500 mt-1">创建、查看和管理项目合同</p></div>
          <Button className="bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={() => navigate("/contracts/new")}><Plus className="w-4 h-4 mr-2" />创建合同</Button>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><Input className="pl-10" placeholder="搜索合同编号..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px]"><SelectValue placeholder="全部状态" /></SelectTrigger><SelectContent><SelectItem value="">全部状态</SelectItem><SelectItem value="signed">签约</SelectItem><SelectItem value="executing">执行</SelectItem><SelectItem value="completed">完成</SelectItem></SelectContent></Select>
        </div>
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>合同编号</TableHead><TableHead>合同名称</TableHead><TableHead>需方</TableHead><TableHead>项目</TableHead><TableHead>含税金额</TableHead><TableHead>状态</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">暂无合同数据</TableCell></TableRow>
              ) : contracts.map((c: { id: number; contractNo: string; name: string; partyB: string; projectName: string; taxAmount: string | number; status: string }) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-sm">{c.contractNo}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.partyB}</TableCell>
                  <TableCell>{c.projectName}</TableCell>
                  <TableCell>¥{Number(c.taxAmount).toFixed(2)}</TableCell>
                  <TableCell><Badge variant="outline" className={statusColors[c.status]}>{statusLabels[c.status]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setViewingId(c.id); setViewDialogOpen(true); }}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/contracts/edit/${c.id}`)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => { if (confirm("确定删除此合同吗？")) deleteMut.mutate({ id: c.id }); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="flex items-center justify-between"><span>合同预览</span><Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />打印</Button></DialogTitle></DialogHeader>
            {viewingContract && <div className="mt-4 border rounded-lg overflow-auto" dangerouslySetInnerHTML={{ __html: (() => {
              const t = templates.find((x: { id: number | null }) => x.id === viewingContract.templateId);
              let h = viewingContract.content || t?.content || "";
              const ps = (viewingContract.paymentSchedule || []).map((p: { date: string; amount: number; note: string }) => `<tr><td style="border:1px solid #333;padding:8px">${p.date}</td><td style="border:1px solid #333;padding:8px;text-align:right">${Number(p.amount).toFixed(2)}</td><td style="border:1px solid #333;padding:8px">${p.note}</td></tr>`).join("");
              return h.replace(/\{\{contractName\}\}/g, viewingContract.name).replace(/\{\{contractNo\}\}/g, viewingContract.contractNo).replace(/\{\{partyB\}\}/g, viewingContract.partyB).replace(/\{\{contractDate\}\}/g, new Date(viewingContract.contractDate).toLocaleDateString("zh-CN")).replace(/\{\{projectName\}\}/g, viewingContract.projectName).replace(/\{\{productName\}\}/g, viewingContract.productName).replace(/\{\{quantity\}\}/g, String(viewingContract.quantity)).replace(/\{\{taxPrice\}\}/g, Number(viewingContract.taxPrice).toFixed(2)).replace(/\{\{taxAmount\}\}/g, Number(viewingContract.taxAmount).toFixed(2)).replace(/\{\{taxRate\}\}/g, String(viewingContract.taxRate)).replace(/\{\{invoiceType\}\}/g, viewingContract.invoiceType).replace(/\{\{paymentSchedule\}\}/g, `<table style="width:100%;border-collapse:collapse"><tr style="background:#f5f5f5"><th style="border:1px solid #333;padding:8px">日期</th><th style="border:1px solid #333;padding:8px">金额(元)</th><th style="border:1px solid #333;padding:8px">备注</th></tr>${ps}</table>`);
            })() }} />}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
