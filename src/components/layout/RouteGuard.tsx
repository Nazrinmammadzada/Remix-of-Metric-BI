import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type Role = "HR" | "USER" | "SUPER_ADMIN" | "MANAGER";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: Role;
  blockRoles?: Role[];
}

const RouteGuard = ({ children, requiredPermissions, requiredRole, blockRoles }: RouteGuardProps) => {
  const { user, hasPermission } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/access-denied" replace />;
  }

  if (blockRoles && blockRoles.includes(user.role)) {
    // Super Admin yalnız öz panelinə daxil ola bilər.
    if (user.role === "SUPER_ADMIN") return <Navigate to="/super-admin" replace />;
    return <Navigate to="/access-denied" replace />;
  }

  if (requiredPermissions && requiredPermissions.length > 0 && !requiredPermissions.some(p => hasPermission(p))) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};

export default RouteGuard;
