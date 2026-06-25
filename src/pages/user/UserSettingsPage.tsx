import { useState } from "react";
import Header from "@/components/layout/Header";
import { PageHero } from "@/components/ui/page-hero";
import { Settings2, KeyRound, Copy, Check, User, Mail, Building, Shield, Hash } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateOtp, getUsers } from "@/lib/passwordStore";
import { toast } from "sonner";

const UserSettingsPage = () => {
  const { user } = useAuth();
  const managed = getUsers().find(u => u.email.toLowerCase() === user?.email.toLowerCase());

  const [otpCode, setOtpCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateOtp = () => {
    if (!user?.email) return;
    const code = generateOtp(user.email);
    setOtpCode(code);
    setCopied(false);
  };

  const copyOtp = () => {
    if (!otpCode) return;
    navigator.clipboard.writeText(otpCode);
    setCopied(true);
    toast.success("Birdəfəlik şifrə kopyalandı");
    setTimeout(() => setCopied(false), 2000);
  };

  const fields = [
    { label: "FİN", value: managed?.fin || "—", icon: Hash, mono: true },
    { label: "Ad Soyad", value: user?.name || "—", icon: User },
    { label: "Email", value: user?.email || "—", icon: Mail },
    { label: "Departament", value: user?.department || managed?.department || "—", icon: Building },
    { label: "Rol", value: user?.role || "—", icon: Shield },
  ];

  return (
    <div className="min-h-screen">
      <Header title="Ayarlar" />
      <main className="p-6 pb-24">
        <PageHero
          badge="Hesab İdarəsi"
          icon={Settings2}
          title="Ayarlar"
          subtitle="Hesab parametrlərinizi və şifrənizi idarə edin"
        />
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex gap-1 border-b border-border mb-6">
            <button className="px-4 py-2 text-sm font-medium border-b-2 border-primary text-foreground">
              Şifrələrin İdarə Olunması
            </button>
          </div>

          <div className="space-y-6">
            {/* Read-only personal info */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">Şəxsi Məlumatlarım</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Bu məlumatlar yalnız baxış üçündür. Dəyişiklik üçün HR ilə əlaqə saxlayın.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fields.map((f) => (
                  <div key={f.label} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <f.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{f.label}</p>
                      <p className={`text-sm font-medium text-foreground mt-0.5 truncate ${f.mono ? 'font-mono' : ''}`}>
                        {f.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* OTP operator */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-1">Birdəfəlik Şifrə</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Şifrənizi unutmusunuzsa, özünüz üçün birdəfəlik kod yarada və "Şifrəni Unutmuşam" səhifəsində istifadə edə bilərsiniz.
              </p>
              <button
                onClick={handleGenerateOtp}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium shadow-sm hover:shadow-md transition-shadow"
              >
                <KeyRound className="w-4 h-4" /> Birdəfəlik şifrə yarat
              </button>
            </div>
          </div>
        </div>

        {/* OTP dialog */}
        <Dialog open={!!otpCode} onOpenChange={() => setOtpCode(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" /> Birdəfəlik Şifrə
              </DialogTitle>
            </DialogHeader>
            {otpCode && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <p className="text-xs text-muted-foreground">İstifadəçi</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Yeni birdəfəlik şifrə</p>
                  <div className="inline-flex items-center gap-3 bg-primary/5 border-2 border-dashed border-primary/30 rounded-xl px-6 py-4">
                    <span className="text-3xl font-bold tracking-widest font-mono text-primary">{otpCode}</span>
                    <button onClick={copyOtp} className="p-2 rounded-md hover:bg-primary/10 transition-colors" title="Kopyala">
                      {copied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5 text-primary" />}
                    </button>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-foreground/80">
                  <p className="font-medium mb-1">Diqqət:</p>
                  <ul className="space-y-0.5 list-disc list-inside text-muted-foreground">
                    <li>Bu şifrə 24 saat ərzində aktivdir</li>
                    <li>Hər dəfə açar düyməsinə basanda yeni şifrə yaranır</li>
                    <li>"Şifrəni Unutmuşam" səhifəsində bu kodla parol yeniləyə bilərsiniz</li>
                  </ul>
                </div>
                <button onClick={() => setOtpCode(null)} className="w-full py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                  Bağla
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default UserSettingsPage;
