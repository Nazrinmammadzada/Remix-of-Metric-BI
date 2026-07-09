import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Eye, EyeOff, KeyRound, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const ChangePasswordPage = () => {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strong = pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!strong) {
      setError("Şifrə ən az 8 simvol olmalı, böyük/kiçik hərf və rəqəm ehtiva etməlidir");
      return;
    }
    if (pwd !== confirm) {
      setError("Şifrələr uyğun gəlmir");
      return;
    }
    setLoading(true);
    const res = await changePassword(pwd);
    setLoading(false);
    if (!res.success) {
      setError(res.error || "Şifrəni dəyişmək mümkün olmadı");
      return;
    }
    toast.success("Şifrə uğurla dəyişdirildi");
    const dest = user?.role === "SUPER_ADMIN" ? "/super-admin"
      : user?.role === "HR" ? "/hr"
      : user?.role === "MANAGER" ? "/manager"
      : "/user";
    navigate(dest, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg p-8">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
          <KeyRound className="w-6 h-6 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold text-foreground text-center">Şifrəni dəyişin</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          {user?.email}
        </p>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mt-5 text-sm">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">
            İlk giriş üçün müvəqqəti şifrə istifadə etdiniz. Davam etmək üçün yeni şəxsi şifrə təyin etməlisiniz.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 mt-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground">Yeni şifrə</label>
            <div className="relative mt-1">
              <input
                type={show ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                className="w-full pr-10 px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className={`text-xs mt-1 ${strong ? "text-emerald-600" : "text-muted-foreground"}`}>
              Ən az 8 simvol, böyük və kiçik hərf, rəqəm.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Şifrəni təsdiqləyin</label>
            <input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="mt-1 w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {loading ? "Yenilənir..." : "Şifrəni yenilə və davam et"}
          </button>
          <button
            type="button"
            onClick={() => { logout(); navigate("/login", { replace: true }); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            Çıxış et
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
