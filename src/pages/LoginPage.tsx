import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, Eye, EyeOff, LogIn, Target, TrendingUp, Users, GitBranch, BarChart3, ClipboardList, Award } from "lucide-react";
import logo from "@/assets/logo.png";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setError("");
    if (!email || !password) {
      setError("E-poçt və şifrə daxil edin");
      return;
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        const lower = email.toLowerCase();
        if (lower === "superadmin@kpi.az") navigate("/super-admin");
        else if (lower === "user@kpi.az") navigate("/user");
        else if (lower === "manager@kpi.az") navigate("/manager");
        else navigate("/hr");
      } else {
        setError(result.error || "Giriş uğursuz oldu");
      }
    } finally {
      setLoading(false);
    }
  };

  // Orbit badges – KPI ecosystem
  const orbitBadges = [
    { label: "Hədəflər", icon: Target, color: "text-violet-600", angle: 270, radius: 220 },
    { label: "Performans", icon: TrendingUp, color: "text-emerald-600", angle: 330, radius: 220 },
    { label: "Kaskadlama", icon: GitBranch, color: "text-amber-700", angle: 30, radius: 150 },
    { label: "Hesabatlar", icon: BarChart3, color: "text-sky-600", angle: 90, radius: 220 },
    { label: "Komandalar", icon: Users, color: "text-rose-600", angle: 150, radius: 220 },
    { label: "Qiymətləndirmə", icon: ClipboardList, color: "text-indigo-600", angle: 210, radius: 150 },
    { label: "Bonus", icon: Award, color: "text-fuchsia-600", angle: 0, radius: 150 },
  ];

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* Left – form */}
      <div className="relative flex items-center justify-center p-6 lg:p-10">
        {/* subtle grid bg */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
              <LogIn className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Hesabınıza daxil olun!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sizə verilən e-poçt və şifrə ilə KPİ sisteminə daxil olun
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground">
                E-poçt <span className="text-destructive">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="E-poçt ünvanınızı daxil edin"
                className="w-full mt-1 px-4 py-3 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition"
                autoComplete="email"
              />
              {touched && !email && (
                <p className="text-xs text-destructive font-medium mt-1.5">E-poçt tələb olunur</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Şifrə <span className="text-destructive">*</span>
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Şifrənizi daxil edin"
                  className="w-full pr-10 px-4 py-3 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/30 focus:border-primary focus:outline-none transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {touched && !password && (
                <p className="text-xs text-destructive font-medium mt-1.5">Şifrə tələb olunur</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Şifrəni unutdunmu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {loading ? "Daxil olunur..." : "Daxil ol"}
            </button>
          </form>
        </div>
      </div>

      {/* Right – KPI orbit illustration */}
      <div className="hidden lg:flex relative items-center justify-center p-10 bg-gradient-to-br from-secondary/40 via-background to-primary/5 border-l border-border overflow-hidden">
        <div className="absolute inset-6 rounded-3xl border border-border/60 bg-card/40 backdrop-blur-sm" />
        <div className="relative w-[520px] h-[520px] flex items-center justify-center">
          {/* concentric circles */}
          <div className="absolute inset-0 rounded-full border border-dashed border-primary/20" />
          <div className="absolute inset-12 rounded-full border border-dashed border-primary/25" />
          <div className="absolute inset-24 rounded-full border border-dashed border-primary/30" />

          {/* center logo card */}
          <div className="relative z-10 w-44 h-44 rounded-full bg-card border border-border shadow-xl flex flex-col items-center justify-center">
            <img src={logo} alt="KPI Logo" className="w-12 h-12 object-contain mb-2" />
            <p className="text-[11px] font-bold tracking-[0.18em] text-foreground text-center leading-tight">
              KPİ<br />MANAGEMENT<br />SİSTEMİ
            </p>
          </div>

          {/* orbiting badges */}
          {orbitBadges.map((b, i) => {
            const rad = (b.angle * Math.PI) / 180;
            const x = Math.cos(rad) * b.radius;
            const y = Math.sin(rad) * b.radius;
            const Icon = b.icon;
            return (
              <div
                key={i}
                className="absolute flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-md"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <span className={`text-sm font-semibold ${b.color}`}>{b.label}</span>
                <Icon className={`w-4 h-4 ${b.color}`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
