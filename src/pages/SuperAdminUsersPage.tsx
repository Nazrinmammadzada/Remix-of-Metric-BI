import { useState } from "react";
import { Plus, Mail, Trash2, Search, ShieldCheck, ShieldOff, X, Check, KeyRound, Copy, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  useHrAdmins,
  createHrAdmin,
  deleteHrAdmin,
  setHrAdminActive,
  setHrAdminPermissions,
  setHrAdminMustChangePassword,
  HrAdminAccount,
} from "@/lib/hrAdminStore";
import { setPasswordForEmail } from "@/lib/passwordStore";
import { MODULE_PERMS, ALL_MODULE_KEYS } from "@/lib/modulePermissions";

const OneTimePasswordPanel = ({
  email,
  password,
  onClose,
}: { email: string; password: string; onClose: () => void }) => {
  const [ack, setAck] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard.writeText(password).then(() => {
    setCopied(true);
    toast.success("Şifrə kopyalandı");
  });
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          Bu şifrə YALNIZ indi göstərilir. Bağladıqdan sonra sistem şifrəni bir daha göstərməyəcək.
          İndi kopyalayıb istifadəçiyə təhlükəsiz kanal ilə çatdırın. İstifadəçi ilk girişdə şifrəni məcburi dəyişəcək.
        </p>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">E-poçt</label>
        <div className="mt-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono">{email}</div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Müvəqqəti şifrə</label>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background font-mono break-all">{password}</div>
          <button onClick={copy} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm">
            <Copy className="w-4 h-4" /> {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
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

const SuperAdminUsersPage = () => {
  const admins = useHrAdmins();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [permEditId, setPermEditId] = useState<string | null>(null);
  const [pwdResetId, setPwdResetId] = useState<string | null>(null);

  const filtered = admins.filter(
    a =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = (a: HrAdminAccount) => {
    if (!confirm(`"${a.name}" HR (Admin) hesabı silinsin?`)) return;
    deleteHrAdmin(a.id);
    toast.success("HR (Admin) hesabı silindi");
  };

  const handleToggleActive = (a: HrAdminAccount) => {
    setHrAdminActive(a.id, !a.active);
    toast.success(a.active ? "Hesab deaktiv edildi" : "Hesab aktiv edildi");
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> HR (Admin) Hesabları
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Yeni HR (Admin) yaradın, e-poçt təyin edin və modul səlahiyyətlərini idarə edin.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Yeni HR (Admin)
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl">
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ad və ya email üzrə axtar..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Ad</th>
                <th className="text-left px-4 py-3 font-medium">E-poçt</th>
                <th className="text-left px-4 py-3 font-medium">Səlahiyyətlər</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Əməliyyatlar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Hələ heç bir HR (Admin) hesabı yaradılmayıb.
                  </td>
                </tr>
              )}
              {filtered.map(a => (
                <tr key={a.id} className="border-t border-border hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                        {a.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{a.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {a.email}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setPermEditId(a.id)}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {a.permissions.length} / {ALL_MODULE_KEYS.length} modul • İdarə et
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {a.active ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-zone-green-bg text-zone-green-text">
                        Aktiv
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                        Deaktiv
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPwdResetId(a.id)}
                        title="Şifrəni sıfırla"
                        className="w-8 h-8 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(a)}
                        title={a.active ? "Deaktiv et" : "Aktiv et"}
                        className="w-8 h-8 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center"
                      >
                        {a.active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        title="Sil"
                        className="w-8 h-8 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
      </div>

      {showCreate && <CreateAdminDialog onClose={() => setShowCreate(false)} />}
      {permEditId && (
        <PermissionsDialog
          admin={admins.find(a => a.id === permEditId)!}
          onClose={() => setPermEditId(null)}
        />
      )}
      {pwdResetId && (
        <ResetPasswordDialog
          admin={admins.find(a => a.id === pwdResetId)!}
          onClose={() => setPwdResetId(null)}
        />
      )}
    </div>
  );
};

// ---------- Create dialog ----------
const CreateAdminDialog = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<string[]>([...ALL_MODULE_KEYS]);

  const togglePerm = (k: string) =>
    setPerms(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]));

  const submit = () => {
    const res = createHrAdmin(name, email, password, perms);
    if (!res.ok) {
      toast.error(res.error || "Xəta baş verdi");
      return;
    }
    toast.success("HR (Admin) hesabı yaradıldı");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Yeni HR (Admin) Hesabı</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground">Ad Soyad</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                placeholder="Məs. Ayan Məmmədova"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">E-poçt</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                placeholder="admin@kpi.az"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Başlanğıc şifrə</label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              placeholder="Ən az 6 simvol"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Bu şifrə yeni HR (Admin)-ə e-poçt vasitəsilə təhvil verilir.
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Modul Səlahiyyətləri</label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setPerms([...ALL_MODULE_KEYS])}
                  className="px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70"
                >
                  Hamısını seç
                </button>
                <button
                  onClick={() => setPerms([])}
                  className="px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70"
                >
                  Təmizlə
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-lg bg-background">
              {MODULE_PERMS.map(m => {
                const checked = perms.includes(m.key);
                return (
                  <label
                    key={m.key}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePerm(m.key)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-foreground">{m.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary">
            Ləğv et
          </button>
          <button onClick={submit} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90">
            Yarat
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Permissions edit dialog ----------
const PermissionsDialog = ({ admin, onClose }: { admin: HrAdminAccount; onClose: () => void }) => {
  const [perms, setPerms] = useState<string[]>(admin.permissions);
  const togglePerm = (k: string) =>
    setPerms(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]));
  const save = () => {
    setHrAdminPermissions(admin.id, perms);
    toast.success("Səlahiyyətlər yeniləndi");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">Səlahiyyətlər</h3>
            <p className="text-xs text-muted-foreground">{admin.name} • {admin.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-end gap-2 text-xs mb-2">
            <button onClick={() => setPerms([...ALL_MODULE_KEYS])} className="px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70">
              Hamısını ver
            </button>
            <button onClick={() => setPerms([])} className="px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70">
              Hamısını geri al
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 border border-border rounded-lg bg-background">
            {MODULE_PERMS.map(m => {
              const checked = perms.includes(m.key);
              return (
                <label key={m.key} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer text-sm">
                  <input type="checkbox" checked={checked} onChange={() => togglePerm(m.key)} className="w-4 h-4 accent-primary" />
                  <span className="text-foreground">{m.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary">
            Ləğv et
          </button>
          <button onClick={save} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1">
            <Check className="w-4 h-4" /> Yadda saxla
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Reset password dialog ----------
const ResetPasswordDialog = ({ admin, onClose }: { admin: HrAdminAccount; onClose: () => void }) => {
  const [pwd, setPwd] = useState("");
  const submit = () => {
    if (pwd.trim().length < 6) {
      toast.error("Şifrə ən az 6 simvol olmalıdır");
      return;
    }
    setPasswordForEmail(admin.email, pwd.trim());
    toast.success("Şifrə yeniləndi");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="text-lg font-bold text-foreground">Şifrəni Sıfırla</h3>
            <p className="text-xs text-muted-foreground">{admin.name} • {admin.email}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <label className="text-sm font-medium text-foreground">Yeni şifrə</label>
          <input
            type="text"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
            placeholder="Ən az 6 simvol"
            autoFocus
          />
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary">
            Ləğv et
          </button>
          <button onClick={submit} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90">
            Yenilə
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminUsersPage;
