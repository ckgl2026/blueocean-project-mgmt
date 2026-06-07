import { Routes, Route } from "react-router";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/admin/UserManagement";
import ProjectManagement from "./pages/admin/ProjectManagement";
import TemplateManagement from "./pages/contract/TemplateManagement";
import ContractManagement from "./pages/contract/ContractManagement";
import ContractForm from "./pages/contract/ContractForm";
import BudgetManagement from "./pages/admin/BudgetManagement";
import QualityRecords from "./pages/project/QualityRecords";
import IdleLogs from "./pages/project/IdleLogs";
import ReworkLedgers from "./pages/project/ReworkLedgers";
import { Toaster } from "@/components/ui/sonner";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/projects" element={<ProjectManagement />} />
        <Route path="/templates" element={<TemplateManagement />} />
        <Route path="/contracts" element={<ContractManagement />} />
        <Route path="/contracts/new" element={<ContractForm />} />
        <Route path="/contracts/edit/:id" element={<ContractForm />} />
        <Route path="/budgets" element={<BudgetManagement />} />
        <Route path="/quality" element={<QualityRecords />} />
        <Route path="/idle-logs" element={<IdleLogs />} />
        <Route path="/rework" element={<ReworkLedgers />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-center" />
    </>
  );
}
