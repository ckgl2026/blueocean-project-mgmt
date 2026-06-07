import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileDown, Upload, AlertTriangle, CheckCircle } from "lucide-react";
import { exportAllData, importAllData } from "@/lib/dataService";
import { toast } from "sonner";

export default function DataSync() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importResult, setImportResult] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const data = exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `蓝海项目管理数据备份-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("数据导出成功");
    } catch {
      toast.error("数据导出失败");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (confirm("导入数据将覆盖当前所有数据，确定要继续吗？")) {
          importAllData(data);
          setImportResult(`成功导入！备份时间：${data.exportedAt || "未知"}`);
          toast.success("数据导入成功，页面将刷新");
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch {
        setImportResult("导入失败：文件格式错误");
        toast.error("导入失败");
      }
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        <FileDown className="w-4 h-4 mr-1" />
        数据同步
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>数据备份与同步</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-700 text-sm">
                当前部署环境为本地存储模式。要在不同电脑间共享数据，请使用导出/导入功能。
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">导出数据</h3>
              <p className="text-xs text-gray-500">
                将所有数据导出为 JSON 文件，可在其他电脑上导入。
              </p>
              <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a6f]" onClick={handleExport}>
                <FileDown className="w-4 h-4 mr-2" />
                导出全部数据
              </Button>
            </div>

            <div className="border-t pt-4 space-y-2">
              <h3 className="text-sm font-medium">导入数据</h3>
              <p className="text-xs text-gray-500">
                从 JSON 文件导入数据，将覆盖当前所有数据。
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                导入数据文件
              </Button>
            </div>

            {importResult && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-700 text-sm">
                  {importResult}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
