import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/providers/trpc";

export default function Login() {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("blueocean_token", data.token);
      window.location.href = "/#/";
    },
    onError: (err) => {
      setError(err.message);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const username = usernameRef.current?.value.trim() || "";
    const password = passwordRef.current?.value || "";

    setError("");
    if (!username) {
      setError("请输入用户名");
      return;
    }

    setIsSubmitting(true);
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] via-[#1e4a6f] to-[#2d5a87]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl" />
      </div>
      <Card className="w-full max-w-md mx-4 shadow-2xl border-0 relative z-10">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-[#1e3a5f] rounded-xl flex items-center justify-center mb-2">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-[#1e3a5f]">蓝海公司</CardTitle>
          <CardDescription className="text-base text-gray-500">全流程项目管理系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="text-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" ref={usernameRef} placeholder="请输入用户名" className="h-11" autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码（初始为空格）</Label>
              <Input id="password" ref={passwordRef} type="password" placeholder="密码为空格，请直接按空格键" className="h-11" autoComplete="current-password" />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full h-11 bg-[#1e3a5f] hover:bg-[#2a4a6f] text-white disabled:opacity-50">
              {isSubmitting ? "登录中..." : "登录"}
            </Button>
            <div className="text-center text-xs text-gray-400 pt-2">
              超级管理员: wangshujun / 空格<br />
              合同管理员: hetong / 空格<br />
              项目经理人: jingli / 空格
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
