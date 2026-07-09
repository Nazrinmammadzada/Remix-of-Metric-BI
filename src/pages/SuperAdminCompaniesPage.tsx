import { useEffect, useRef, useState } from "react";
import {
  Building2, Plus, Trash2, KeyRound, Copy, Eye, EyeOff, X, Check, RefreshCw, Upload, Mail, ShieldAlert, Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  Company,
  createCompany,
  deleteCompany,
  ensureCompanySeed,
  generateStrongPassword,
  updateCompanyAdminPassword,
  useCompanies,
  makeFallbackLogo,
} from "@/lib/companiesStore";

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const SuperAdminCompaniesPage = () => {
  useEffect(() => { ensureCompanySeed(); }, []);
  const companies = useCompanies();
  const [showCreate, setShowCreate] = useState(false);
  const [pwdResetId, setPwdResetId] = useState<string | null>(null);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} kopyalandı`));
  };

  const handleDelete = (c: Company) => {
    if (!confirm(`"${c.name}" şirkəti və admin hesabı silinsin?`)) return;
    const res = deleteCompany(c.id);
    if (!res.ok) {
      toast.error(res.error || "Silmək mümkün olmadı", { duration: 6000 });
      return;
    }
    toast.success("Şirkət silindi");
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> Şirkətlər
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Yeni şirkət yaradın, logo təyin edin və hər şirkət üçün admin hesabını idarə edin.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Yeni Şirkət
        </button>
      </div>

      {companies.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          Hələ heç bir şirkət yaradılmayıb.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map(c => (
            <div key={c.id} className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <img
                  src={c.logo || makeFallbackLogo(c.name.charAt(0).toUpperCase(), "#64748B")}
                  alt={c.name}
                  className="w-14 h-14 rounded-lg object-cover bg-secondary"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Yaradılıb: {new Date(c.createdAt).toLocaleDateString("az-AZ")}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(c)}
                  title="Şirkəti sil"
                  className="w-8 h-8 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-lg border border-border bg-background p-3 space-y-2 text-sm">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admin Hesabı</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground truncate">{c.admin.name}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0" /> {c.admin.email}
                  </span>
                  <button
                    onClick={() => copy(c.admin.email, "E-poçt")}
                    className="w-7 h-7 rounded-md hover:bg-secondary flex items-center justify-center shrink-0"
                    title="Kopyala"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" />
                  Şifrə təhlükəsizlik səbəbindən gizlədilib. Sıfırlayaraq yeni şifrə əldə edin.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPwdResetId(c.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm hover:bg-secondary"
                >
                  <KeyRound className="w-4 h-4" /> Şifrəni yenilə
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateCompanyDialog onClose={() => setShowCreate(false)} />}
      {pwdResetId && (
        <ResetCompanyPasswordDialog
          company={companies.find(c => c.id === pwdResetId)!}
          onClose={() => setPwdResetId(null)}
        />
      )}
    </div>
  );
};

// ---------------- One-time credential reveal ----------------

const OneTimeCredentialsView = ({
  title,
  email,
  password,
  onClose,
}: {
  title: string;
  email: string;
  password: string;
  onClose: () => void;
}) => {
  const [ack, setAck] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      toast.success("Şifrə kopyalandı");
    });
  };
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-muted-foreground mt-1">
            Bu şifrə YALNIZ indi göstərilir. Bağladıqdan sonra sistem şifrəni bir daha göstərməyəcək.
            Zəhmət olmasa indi kopyalayın və istifadəçiyə təhlükəsiz kanal vasitəsilə təhvil verin.
          </p>
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">E-poçt</label>
        <div className="mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono">
          {email}
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Müvəqqəti şifrə</label>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono break-all">
            {password}
          </div>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm"
          >
            <Copy className="w-4 h-4" /> {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          İstifadəçi ilk girişdə bu şifrəni məcburi olaraq dəyişəcək.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="mt-0.5 w-4 h-4 accent-primary" />
        <span className="text-foreground">Şifrəni qeyd etdim və istifadəçiyə çatdıracağam.</span>
      </label>
      <div className="flex items-center justify-end">
        <button
          onClick={onClose}
          disabled={!ack}
          className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          Bağla
        </button>
      </div>
    </div>
  );
};

// ---------------- Create ----------------

const CreateCompanyDialog = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => generateStrongPassword());
  const [showPwd, setShowPwd] = useState(true);
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = async (f: File | null) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Logo 2MB-dan kiçik olmalıdır");
      return;
    }
    setLogo(await readFileAsDataUrl(f));
  };

  const submit = () => {
    const res = createCompany(name, logo, adminName, email || undefined, password);
    if (!res.ok || !res.company || !res.plaintextPassword) {
      toast.error(res.error || "Xəta baş verdi");
      return;
    }
    toast.success("Şirkət yaradıldı");
    setReveal({ email: res.company.admin.email, password: res.plaintextPassword });
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">
            {reveal ? "Admin hesabı yaradıldı" : "Yeni Şirkət"}
          </h3>
          <button
            onClick={reveal ? undefined : onClose}
            disabled={!!reveal}
            className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {reveal ? (
          <OneTimeCredentialsView
            title="Müvəqqəti şifrə bir dəfəlik göstərilir"
            email={reveal.email}
            password={reveal.password}
            onClose={onClose}
          />
        ) : (
        <>
        <div className="p-5 space-y-5 overflow-y-auto">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl bg-secondary flex items-center justify-center overflow-hidden border border-border">
              {logo ? (
                <img src={logo} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-secondary"
              >
                <Upload className="w-4 h-4" /> Logo yüklə
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => onPick(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground mt-2">PNG/JPG/SVG • max 2MB</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Şirkətin adı</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              placeholder="Məs. AzeriTech LLC"
            />
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3 bg-background">
            <p className="text-sm font-semibold text-foreground">Admin Hesabı</p>
            <div>
              <label className="text-xs text-muted-foreground">Admin Ad Soyad</label>
              <input
                value={adminName}
                onChange={e => setAdminName(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                placeholder="Məs. Rauf Quliyev"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">E-poçt (boş buraxılsa avtomatik təyin olunur)</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                placeholder="admin@sirket.kpi.az"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Müvəqqəti şifrə (avtomatik yaradılıb)</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                />
                <button
                  onClick={() => setShowPwd(s => !s)}
                  className="w-9 h-9 rounded-lg border border-border hover:bg-secondary flex items-center justify-center"
                  title={showPwd ? "Gizlət" : "Göstər"}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setPassword(generateStrongPassword())}
                  className="w-9 h-9 rounded-lg border border-border hover:bg-secondary flex items-center justify-center"
                  title="Yeni şifrə generate et"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Yaratdıqdan sonra şifrə YALNIZ bir dəfə göstəriləcək.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary">
            Ləğv et
          </button>
          <button onClick={submit} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
            <Check className="w-4 h-4" /> Yarat
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

// ---------------- Reset password ----------------

const ResetCompanyPasswordDialog = ({ company, onClose }: { company: Company; onClose: () => void }) => {
  const [pwd, setPwd] = useState(() => generateStrongPassword());
  const [show, setShow] = useState(true);
  const [reveal, setReveal] = useState<string | null>(null);

  const submit = () => {
    if (pwd.trim().length < 6) {
      toast.error("Şifrə ən az 6 simvol olmalıdır");
      return;
    }
    updateCompanyAdminPassword(company.id, pwd.trim());
    toast.success("Şifrə yeniləndi");
    setReveal(pwd.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">
              {reveal ? "Yeni müvəqqəti şifrə" : "Şifrəni yenilə"}
            </h3>
            <p className="text-xs text-muted-foreground">{company.name} • {company.admin.email}</p>
          </div>
          <button
            onClick={reveal ? undefined : onClose}
            disabled={!!reveal}
            className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center disabled:opacity-30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {reveal ? (
          <OneTimeCredentialsView
            title="Yeni şifrə bir dəfəlik göstərilir"
            email={company.admin.email}
            password={reveal}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="p-5">
              <label className="text-sm font-medium text-foreground">Yeni şifrə</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type={show ? "text" : "password"}
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono"
                  autoFocus
                />
                <button
                  onClick={() => setShow(s => !s)}
                  className="w-9 h-9 rounded-lg border border-border hover:bg-secondary flex items-center justify-center"
                  title={show ? "Gizlət" : "Göstər"}
                >
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setPwd(generateStrongPassword())}
                  className="w-9 h-9 rounded-lg border border-border hover:bg-secondary flex items-center justify-center"
                  title="Yeni şifrə generate et"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Şifrə yeniləndikdə istifadəçi növbəti girişdə onu məcburi dəyişəcək və şifrə YALNIZ bir dəfə göstəriləcək.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary">
                Ləğv et
              </button>
              <button onClick={submit} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90">
                Yenilə
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SuperAdminCompaniesPage;
