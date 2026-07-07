import { useState } from "react";
import { Pencil, KeyRound, Search, Copy, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUsers, updateUser, generateOtp, type ManagedUser } from "@/lib/passwordStore";
import { toast } from "sonner";

const PasswordManagementTab = () => {
  const [users, setUsers] = useState<ManagedUser[]>(() => getUsers());
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({ fin: "", name: "", email: "" });
  const [otpDialog, setOtpDialog] = useState<{ user: ManagedUser; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = users.filter(u =>
    u.fin.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (u: ManagedUser) => {
    setEditing(u);
    setEditForm({ fin: u.fin, name: u.name, email: u.email });
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editForm.fin.trim() || !editForm.name.trim() || !editForm.email.trim()) {
      toast.error("Bütün xanaları doldurun");
      return;
    }
    const updated = updateUser(editing.id, editForm);
    setUsers(updated);
    setEditing(null);
    toast.success("İstifadəçi məlumatları yeniləndi");
  };

  const handleGenerateOtp = (u: ManagedUser) => {
    const code = generateOtp(u.email);
    setOtpDialog({ user: u, code });
    setCopied(false);
  };

  const copyOtp = () => {
    if (!otpDialog) return;
    navigator.clipboard.writeText(otpDialog.code);
    setCopied(true);
    toast.success("Birdəfəlik şifrə kopyalandı");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Şifrələrin İdarə Olunması</h3>
            <p className="text-xs text-muted-foreground mt-1">İstifadəçilər üçün birdəfəlik şifrə yarat və məlumatları redaktə et</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Axtar (FİN, ad, email)..."
              className="pl-10 pr-3 py-2 text-sm border border-border rounded-lg bg-background w-64 focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-left bg-muted/30 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 w-32">Əməliyyat</th>
                <th className="px-5 py-3">FİN</th>
                <th className="px-5 py-3">Ad Soyad</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Departament</th>
                <th className="px-5 py-3">Rol</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(u)}
                        title="Redaktə et"
                        className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleGenerateOtp(u)}
                        title="Birdəfəlik şifrə yarat"
                        className="p-1.5 rounded-md hover:bg-primary/10 transition-colors"
                      >
                        <KeyRound className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">{u.fin}</td>
                  <td className="px-5 py-3 font-medium">{u.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-5 py-3 text-muted-foreground">{u.department}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${u.role === "HR" ? "bg-primary/10 text-primary" : "bg-success/10 text-success"}`}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">İstifadəçi tapılmadı</td></tr>
              )}
            </tbody>
          </table>
          </div>
      </div>

      {/* Edit user dialog */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>İstifadəçini Redaktə Et</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">FİN</label>
              <input
                value={editForm.fin}
                onChange={e => setEditForm(p => ({ ...p, fin: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Ad Soyad</label>
              <input
                value={editForm.name}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 text-sm border border-border rounded-lg bg-background focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={saveEdit} className="flex-1 py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">Yadda Saxla</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-2.5 text-sm rounded-lg border border-border bg-card hover:bg-secondary transition-colors">Ləğv Et</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* OTP dialog */}
      <Dialog open={!!otpDialog} onOpenChange={() => setOtpDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Birdəfəlik Şifrə
            </DialogTitle>
          </DialogHeader>
          {otpDialog && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/40 border border-border">
                <p className="text-xs text-muted-foreground">İstifadəçi</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{otpDialog.user.name}</p>
                <p className="text-xs text-muted-foreground">{otpDialog.user.email}</p>
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-2">Yeni birdəfəlik şifrə</p>
                <div className="inline-flex items-center gap-3 bg-primary/5 border-2 border-dashed border-primary/30 rounded-xl px-6 py-4">
                  <span className="text-3xl font-bold tracking-widest font-mono text-primary">{otpDialog.code}</span>
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
                  <li>İstifadəçi "Şifrəni Unutmuşam" səhifəsində bu kodla parol yeniləyə bilər</li>
                </ul>
              </div>

              <button onClick={() => setOtpDialog(null)} className="w-full py-2.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                Bağla
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PasswordManagementTab;
