import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // When the reset email link is opened, Supabase fires PASSWORD_RECOVERY
    // (or an INITIAL_SESSION with a recovery-scoped session).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    // Also check current session on mount.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Şifrə ən az 8 simvol olmalıdır");
      return;
    }
    if (password !== confirm) {
      setError("Şifrələr uyğun gəlmir");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    toast.success("Şifrəniz yeniləndi");
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Yeni şifrə təyin edin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ready ? "Aşağıda yeni şifrənizi daxil edin" : "Sessiya yoxlanılır..."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground">Yeni şifrə</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={!ready}
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Yeni şifrəni təkrarla</label>
            <div className="relative mt-1">
              <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={!ready}
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !ready}
            className="w-full py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {loading ? "Yenilənir..." : "Şifrəni yenilə"}
          </button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
          >
            <ArrowLeft className="w-4 h-4" /> Girişə qayıt
          </Link>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
