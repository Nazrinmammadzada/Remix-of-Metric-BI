import { Outlet, Navigate } from "react-router-dom";
import UserSidebar from "./UserSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider, useAppSidebar } from "@/contexts/SidebarContext";

const Inner = () => {
  const { collapsed } = useAppSidebar();
  return (
    <div className="theme-user min-h-screen bg-background">
      <UserSidebar />
      <div className={`transition-[margin] duration-300 ease-in-out ${collapsed ? "ml-[68px]" : "ml-[210px]"}`}>
        <Outlet />
      </div>
    </div>
  );
};

const UserLayout = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "USER") return <Navigate to="/access-denied" replace />;
  return (
    <SidebarProvider>
      <Inner />
    </SidebarProvider>
  );
};

export default UserLayout;
