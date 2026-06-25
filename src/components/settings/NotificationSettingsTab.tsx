import { useMemo, useState, useEffect } from "react";
import { Bell, Mail, MessageSquare, Smartphone, Search, Save, Users as UsersIcon, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  useNotificationSettings, updateNotificationSetting,
  CHANNEL_LABELS, FREQUENCY_LABELS, RECIPIENT_LABELS,
  type NotificationSetting, type NotificationChannel,
} from "@/lib/notificationSettingsStore";
import { useRoles } from "@/lib/rolesStore";
import { getEmployees } from "@/lib/orgStore";

const channelIcon: Record<NotificationChannel, React.ComponentType<{ className?: string }>> = {
  in_app: Bell,
  email: Mail,
  sms: Smartphone,
};

// Tezliyə görə xatırladıcı dəstəyi: birdəfəlik və event tetikli bildirişlərdə təkrar xatırlatma məntiqlidir;
// gündəlik/həftəlik bildirişlər artıq özü təkrarlanır deyə əlavə xatırladıcı göstərilmir.
const supportsReminders = (freq: NotificationSetting["frequency"]) =>
  freq === "once" || freq === "on_event";

const NotificationSettingsTab = () => {
  const settings = useNotificationSettings();
  const roles = useRoles();
  const employees = useMemo(() => getEmployees().map(e => `${e.firstName} ${e.lastName}`), []);

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(settings[0]?.id ?? null);
  const [draft, setDraft] = useState<NotificationSetting | null>(null);
  const [remDraft, setRemDraft] = useState<string>("");
  const [personOpen, setPersonOpen] = useState(false);
  const [personSearch, setPersonSearch] = useState("");

  const filtered = useMemo(
    () => settings.filter(s => s.title.toLowerCase().includes(search.toLowerCase())),
    [settings, search],
  );

  const selected = settings.find(s => s.id === selectedId) ?? null;
  const current = draft && draft.id === selectedId ? draft : selected;

  // role/person ayrılması: rol adları üçün "role:NAME", şəxslər üçün "person:NAME" prefiksi.
  const recipientList = current?.recipients ?? [];
  const roleRecips = recipientList.filter(r => r.startsWith("role:"));
  const personRecips = recipientList.filter(r => r.startsWith("person:"));

  const startEdit = (s: NotificationSetting) => {
    setSelectedId(s.id);
    setDraft({ ...s });
    setRemDraft(s.reminders.join(", "));
  };

  const toggleChannel = (c: NotificationChannel) => {
    if (!current) return;
    const next = current.channels.includes(c)
      ? current.channels.filter(x => x !== c)
      : [...current.channels, c];
    setDraft({ ...current, channels: next });
  };

  const toggleRecipient = (token: string) => {
    if (!current) return;
    const next = current.recipients.includes(token)
      ? current.recipients.filter(x => x !== token)
      : [...current.recipients, token];
    setDraft({ ...current, recipients: next });
  };

  const save = () => {
    if (!current) return;
    const reminders = supportsReminders(current.frequency)
      ? remDraft.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n))
      : [];
    updateNotificationSetting(current.id, { ...current, reminders });
    toast.success("Bildiriş sazlaması yadda saxlanıldı");
    setDraft(null);
  };

  const filteredPersons = useMemo(
    () => employees.filter(e => e.toLowerCase().includes(personSearch.toLowerCase())),
    [employees, personSearch],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-4">
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bildiriş axtar..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background"
            />
          </div>
        </div>
        <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
          {filtered.map(s => {
            const active = s.id === selectedId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => startEdit(s)}
                className={`w-full text-left px-3 py-3 transition-colors ${active ? "bg-primary/10" : "hover:bg-secondary/50"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>{s.title}</span>
                  <span className={`w-2 h-2 rounded-full ${s.enabled ? "bg-success" : "bg-muted-foreground/40"}`} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground text-center">Nəticə tapılmadı</p>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        {!current ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Soldan bildiriş növü seçin.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{current.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{current.description}</p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <span className="text-muted-foreground">Aktiv</span>
                <button
                  type="button"
                  onClick={() => setDraft({ ...current, enabled: !current.enabled })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${current.enabled ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${current.enabled ? "translate-x-5" : ""}`} />
                </button>
              </label>
            </div>

            {/* Channels */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Göndərmə kanalı</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(CHANNEL_LABELS) as NotificationChannel[]).map(c => {
                  const Icon = channelIcon[c];
                  const on = current.channels.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => toggleChannel(c)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-secondary"}`}
                    >
                      <Icon className="w-4 h-4" />
                      {CHANNEL_LABELS[c]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frequency + time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Tezlik</label>
                <select
                  value={current.frequency}
                  onChange={(e) => setDraft({ ...current, frequency: e.target.value as NotificationSetting["frequency"] })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                >
                  {Object.entries(FREQUENCY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Göndərmə vaxtı</label>
                <input
                  type="time"
                  value={current.sendTime}
                  onChange={(e) => setDraft({ ...current, sendTime: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
              </div>
            </div>

            {/* Reminders — only when frequency supports it */}
            {supportsReminders(current.frequency) ? (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Xatırladıcılar (mərhələ tarixindən gün, mənfi = əvvəl)
                </label>
                <input
                  value={remDraft}
                  onChange={(e) => setRemDraft(e.target.value)}
                  placeholder="Məsələn: -7, -3, -1, 0"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Vergüllə ayırın. "-3" = 3 gün əvvəl, "0" = mərhələ günü, "1" = 1 gün sonra.
                </p>
              </div>
            ) : (
              <div className="text-[12px] text-muted-foreground bg-secondary/40 rounded-lg p-3">
                Seçilmiş tezlik ({FREQUENCY_LABELS[current.frequency]}) artıq təkrarlanan göndərişi əhatə edir — əlavə xatırladıcıya ehtiyac yoxdur.
              </div>
            )}

            {/* Recipients */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground block">Alıcılar</label>
              <div className="flex flex-wrap gap-2">
                {/* Sistem alıcı növləri (köhnə açarlar) + sistemdə olan rollar + Şəxs(lər) — eyni sırada */}
                {Object.entries(RECIPIENT_LABELS).map(([key, label]) => {
                  const on = current.recipients.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleRecipient(key)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-secondary"}`}
                    >
                      {label}
                    </button>
                  );
                })}
                {roles.map(role => {
                  const token = `role:${role.name}`;
                  const on = current.recipients.includes(token);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRecipient(token)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-secondary"}`}
                    >
                      {role.name}
                    </button>
                  );
                })}
                {/* Şəxs(lər) — digərləri ilə eyni sırada chip */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPersonOpen(o => !o)}
                    className={`px-3 py-1.5 text-xs rounded-full border inline-flex items-center gap-1.5 transition-colors ${personRecips.length > 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-secondary"}`}
                  >
                    <UsersIcon className="w-3 h-3" />
                    Şəxs(lər){personRecips.length > 0 ? ` (${personRecips.length})` : ""}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {personOpen && (
                    <div className="absolute z-20 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                      <div className="p-2 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <input
                            value={personSearch}
                            onChange={e => setPersonSearch(e.target.value)}
                            placeholder="Axtar..."
                            className="w-full pl-8 pr-2 py-1.5 text-sm border border-border rounded-md bg-background"
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredPersons.map(p => {
                          const token = `person:${p}`;
                          const on = current.recipients.includes(token);
                          return (
                            <label key={p} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/60 cursor-pointer">
                              <input type="checkbox" checked={on} onChange={() => toggleRecipient(token)} className="w-4 h-4 accent-primary" />
                              <span>{p}</span>
                            </label>
                          );
                        })}
                        {filteredPersons.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">Tapılmadı</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {personRecips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {personRecips.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-foreground text-[11px]">
                      {t.slice("person:".length)}
                      <button type="button" onClick={() => toggleRecipient(t)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Template */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Şablon mətn</label>
              <textarea
                value={current.template}
                onChange={(e) => setDraft({ ...current, template: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Dəyişənlər: <code>{`{kpi_name}`}</code>, <code>{`{target}`}</code>, <code>{`{date}`}</code>, <code>{`{days_left}`}</code>, <code>{`{progress}`}</code>, <code>{`{score}`}</code>, <code>{`{period}`}</code>, <code>{`{sub_kpi_name}`}</code>.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => { setDraft(null); if (selected) setRemDraft(selected.reminders.join(", ")); }}
                className="px-4 py-2 text-sm rounded-lg border border-border bg-card hover:bg-secondary"
              >
                Ləğv et
              </button>
              <button
                type="button"
                onClick={save}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="w-4 h-4" /> Yadda saxla
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationSettingsTab;
