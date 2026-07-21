import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ForgotPasswordPage = () => {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("E-poçt ünvanını daxil edin");
      return;
    }
    setLoading(true);
    const result = await sendPasswordReset(email);
    setLoading(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error || "Sorğu göndərilmədi");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <KeyRound className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Şifrəni Yenilə</h1>
          <p className="text-sm text-muted-foreground mt-1">
            E-poçtunuza şifrə yeniləmə linki göndərəcəyik
          </p>
        </div>

        {sent ? (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-sm text-foreground">
              Əgər <span className="font-medium">{email}</span> sistemdə mövcuddursa,
              şifrə yeniləmə linki göndərildi. E-poçtunuzu yoxlayın.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Girişə qayıt
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground">E-poçt</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {loading ? "Göndərilir..." : "Yeniləmə linki göndər"}
            </button>

            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
            >
              <ArrowLeft className="w-4 h-4" /> Girişə qayıt
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
