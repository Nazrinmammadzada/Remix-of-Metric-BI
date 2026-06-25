import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, useAppSidebar } from "@/contexts/SidebarContext";

const Inner = () => {
  const { collapsed } = useAppSidebar();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={`transition-[margin] duration-300 ease-in-out ${collapsed ? "ml-[68px]" : "ml-[210px]"}`}>
        <Outlet />
      </div>
    </div>
  );
};

const AppLayout = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "HR") return <Navigate to="/access-denied" replace />;
  return (
    <SidebarProvider>
      <Inner />
    </SidebarProvider>
  );
};

export default AppLayout;
