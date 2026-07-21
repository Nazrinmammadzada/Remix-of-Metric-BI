import { Outlet, Navigate } from "react-router-dom";
import ManagerSidebar from "./ManagerSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, useAppSidebar } from "@/contexts/SidebarContext";

const Inner = () => {
  const { collapsed } = useAppSidebar();
  return (
    <div className="theme-manager min-h-screen bg-background">
      <ManagerSidebar />
      <div className={`transition-[margin] duration-300 ease-in-out ${collapsed ? "ml-[68px]" : "ml-[210px]"}`}>
        <Outlet />
      </div>
    </div>
  );
};

const ManagerLayout = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <SidebarProvider>
      <Inner />
    </SidebarProvider>
  );
};

export default ManagerLayout;
