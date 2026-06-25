import { Outlet, Link, useNavigate } from "react-router-dom";
import { ShieldCheck, LogOut, Building2 } from "lucide-react";
import logo from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";

const SuperAdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/super-admin" className="flex items-center gap-3">
            <img src={logo} alt="Metric BI" className="w-9 h-9 object-contain" />
            <div className="leading-tight">
              <p className="text-sm font-bold text-foreground">Metric BI</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Super Admin Paneli
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              to="/super-admin"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-foreground hover:bg-secondary"
            >
              <Building2 className="w-4 h-4" /> Şirkətlər
            </Link>
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-secondary/60">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                {user?.avatar}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-xs font-medium text-foreground">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground">Super Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="w-4 h-4" /> Çıxış
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default SuperAdminLayout;
