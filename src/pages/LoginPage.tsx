import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import logo from "@/assets/logo.png";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email və şifrə daxil edin");
      return;
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        const lower = email.toLowerCase();
        if (lower === "superadmin@kpi.az") {
          navigate("/super-admin");
        } else if (lower === "user@kpi.az") {
          navigate("/user");
        } else {
          navigate("/hr");
        }
      } else {
        setError(result.error || "Giriş uğursuz oldu");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="Metric BI logo" className="w-20 h-20 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Metric BI</h1>
          <p className="text-sm text-muted-foreground mt-1">İdarəetmə Sisteminə Daxil Olun</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@kpi.az"
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Şifrə</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-50 transition-colors"
          >
            {loading ? "Daxil olunur..." : "Daxil Ol"}
          </button>

          <Link to="/forgot-password" className="block text-center text-sm text-primary hover:text-primary/80 hover:underline transition-colors pt-1">
            Şifrəmi unutmuşam
          </Link>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          KPI İdarəetmə Sistemi
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
