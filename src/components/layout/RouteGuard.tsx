import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultPath } from "@/lib/navigation";

type Role = "HR" | "USER" | "SUPER_ADMIN" | "MANAGER";

interface RouteGuardProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: Role;
  blockRoles?: Role[];
}

const RouteGuard = ({ children, requiredPermissions, requiredRole, blockRoles }: RouteGuardProps) => {
  const { user, loading, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  const redirectToDefault = () => {
    const path = getDefaultPath(user);
    if (!path || path === location.pathname) return null;
    return <Navigate to={path} replace />;
  };

  if (requiredRole && user.role !== requiredRole) {
    return redirectToDefault();
  }

  if (blockRoles && blockRoles.includes(user.role)) {
    // Super Admin yalnız öz panelinə daxil ola bilər.
    if (user.role === "SUPER_ADMIN") return <Navigate to="/super-admin" replace />;
    return redirectToDefault();
  }

  if (requiredPermissions && requiredPermissions.length > 0 && !requiredPermissions.some(p => hasPermission(p))) {
    return redirectToDefault();
  }

  return <>{children}</>;
};

export default RouteGuard;
