import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, KeyRound, Loader2, Mail, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acceptInvitation } from "@/lib/invitationsService";

type LookupState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "ready"; email: string; expiresAt: string };

const AcceptInvitePage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [lookup, setLookup] = useState<LookupState>({ status: "loading" });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setLookup({ status: "invalid", message: "Dəvətnamə tokeni tapılmadı." });
      return;
    }
    (async () => {
      // Anonymous lookup is blocked by RLS; use the edge function's "peek" via a
      // simple attempt to fetch; instead just show ready and let submit validate.
      // We resolve email lazily via the edge function response.
      setLookup({ status: "ready", email: "", expiresAt: "" });
    })();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Şifrə minimum 8 simvol olmalıdır");
      return;
    }
    if (password !== confirm) {
      toast.error("Şifrələr eyni deyil");
      return;
    }
    setSubmitting(true);
    try {
      const res = await acceptInvitation({ token, password, firstName, lastName });
      // Sign in the user with the credentials they just set
      await supabase.auth.signInWithPassword({ email: res.email, password });
      setDone(true);
      toast.success("Dəvətnamə qəbul edildi. Sistemə giriş edilir…");
      setTimeout(() => navigate("/", { replace: true }), 1000);
    } catch (err: any) {
      toast.error(err?.message || "Dəvətnamə qəbul edilə bilmədi");
    } finally {
      setSubmitting(false);
    }
  };

  if (lookup.status === "loading") {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (lookup.status === "invalid") {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="w-5 h-5" />
            <h1 className="text-lg font-semibold">Dəvətnamə etibarsızdır</h1>
          </div>
          <p className="text-sm text-muted-foreground">{lookup.message}</p>
          <Link to="/login" className="inline-flex text-sm text-primary hover:underline">Girişə qayıt</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-primary text-sm">
            <Mail className="w-4 h-4" /> Dəvətnamə
          </div>
          <h1 className="text-xl font-semibold">Hesabınızı aktivləşdirin</h1>
          <p className="text-sm text-muted-foreground">
            Ad, soyad və yeni şifrənizi təyin edin. Dəvətnamə qəbul edildikdən sonra sistemə avtomatik daxil olacaqsınız.
          </p>
        </div>

        {done ? (
          <div className="flex items-center gap-2 text-emerald-600 text-sm">
            <CheckCircle2 className="w-5 h-5" /> Uğurla qəbul edildi
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Ad</label>
                <input
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border bg-background"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value.slice(0, 50))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Soyad</label>
                <input
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border bg-background"
                  value={lastName}
                  onChange={e => setLastName(e.target.value.slice(0, 50))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Yeni şifrə</label>
              <input
                type="password"
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border bg-background"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Şifrəni təkrarla</label>
              <input
                type="password"
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-border bg-background"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Dəvətnaməni qəbul et
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AcceptInvitePage;
