import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LayoutGrid, Mail, Lock, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Clock } from "lucide-react";
import { verifyOtp, consumeOtp, setPasswordForEmail, getUsers } from "@/lib/passwordStore";
import { toast } from "sonner";

const FORGOT_LOCK_KEY = "kpi_forgot_lock_until";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Cooldown: counts down but DOES NOT block form submission.
  // Indicates when next password renewal request can be made.
  const [lockUntil, setLockUntil] = useState<number>(() => {
    const saved = localStorage.getItem(FORGOT_LOCK_KEY);
    const n = saved ? Number(saved) : 0;
    return n > Date.now() ? n : 0;
  });
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, lockUntil - now);
  const isCountingDown = remainingMs > 0;
  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCountingDown) {
      setError(`Növbəti yeniləməyə qədər ${mm}:${ss} gözləyin`);
      return;
    }
    setError("");

    if (!email || !otp || !newPass || !confirmPass) {
      setError("Bütün xanaları doldurun");
      return;
    }
    const exists = getUsers().some(u => u.email.toLowerCase() === email.toLowerCase());
    if (!exists) {
      setError("Bu email sistemdə mövcud deyil");
      return;
    }
    if (newPass.length < 6) {
      setError("Yeni şifrə minimum 6 simvol olmalıdır");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Yeni şifrələr uyğun gəlmir");
      return;
    }
    if (!verifyOtp(email, otp)) {
      setError("Birdəfəlik şifrə yanlış və ya vaxtı keçib. HR ilə əlaqə saxlayın.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setPasswordForEmail(email, newPass);
      consumeOtp(email);
      // Start a 5-minute cooldown for the next renewal
      const until = Date.now() + 5 * 60 * 1000;
      localStorage.setItem(FORGOT_LOCK_KEY, String(until));
      setLockUntil(until);
      toast.success("Şifrəniz uğurla yeniləndi");
      setLoading(false);
      navigate("/login");
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Şifrəni Yenilə</h1>
          <p className="text-sm text-muted-foreground mt-1">Birdəfəlik şifrə ilə yeni parolu təyin edin</p>
        </div>

        {isCountingDown && (
          <div className="mb-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-card border border-border shadow-sm">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm text-foreground">Növbəti sorğuya qədər:</span>
            <span className="font-mono font-semibold text-foreground">{mm}:{ss}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm `}>
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
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
                
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none "
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Birdəfəlik şifrə</label>
            <div className="relative mt-1">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                placeholder="6 rəqəmli kod"
                maxLength={6}
                
                className="w-full pl-10 pr-3 py-2.5 text-sm tracking-widest font-mono border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none "
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">HR sizə birdəfəlik şifrə təqdim edir</p>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Yeni şifrə</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPass ? "text" : "password"}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                placeholder="••••••••"
                
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none "
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Yeni şifrəni təkrarla</label>
            <div className="relative mt-1">
              <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPass ? "text" : "password"}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="••••••••"
                
                className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none "
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-50  hover:bg-primary/90 transition-colors"
          >
            {loading ? "Yenilənir..." : "Şifrəni Yenilə"}
          </button>

          <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2">
            <ArrowLeft className="w-4 h-4" /> Girişə qayıt
          </Link>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
