// Bildiriş sazlamaları — hər bildiriş növü üçün kanallar, vaxt və alıcılar.
import { useEffect, useState } from "react";

export type NotificationChannel = "in_app" | "email" | "sms";
/** Alıcı: ya "role:<RoleName>" ya da "person:<Full Name>" ya da köhnə qısa açar (geriyə uyğun) */
export type RecipientRole = string;

export interface NotificationOffset {
  /** Mərhələ tarixindən neçə gün əvvəl/sonra göndərilsin (mənfi = əvvəl) */
  days: number;
  /** Göndərmə vaxtı HH:MM (24h) */
  time: string;
}

export interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  channels: NotificationChannel[];
  /** Tezlik: "once" — bir dəfə, "daily" — gündəlik, "weekly" — həftəlik, "on_event" — hadisə baş verdikdə */
  frequency: "once" | "daily" | "weekly" | "on_event";
  /** Xatırladıcılar — mərhələ tarixindən əvvəl/sonra (məs. -3, -1, 0) */
  reminders: number[];
  /** Göndərmə vaxtı (HH:MM) */
  sendTime: string;
  /** Alıcılar */
  recipients: RecipientRole[];
  /** Şablon mətn */
  template: string;
}

const KEY = "kpi_notification_settings_v1";
const EVT = "notification-settings-updated";

const SEED: NotificationSetting[] = [
  {
    id: "kpi_assignment",
    title: "KPI təyin etmə",
    description: "Yeni KPI əməkdaşa təyin edildikdə bildiriş göndərilir.",
    enabled: true,
    channels: ["in_app", "email"],
    frequency: "on_event",
    reminders: [0],
    sendTime: "09:00",
    recipients: ["owner", "manager"],
    template: "Sizə yeni KPI təyin olundu: {kpi_name}. Hədəf: {target}.",
  },
  {
    id: "kpi_evaluation",
    title: "KPI qiymətləndirmə",
    description: "Qiymətləndirmə dövrü başlayanda və bitməsinə az qaldıqda xatırlatma.",
    enabled: true,
    channels: ["in_app", "email"],
    frequency: "on_event",
    reminders: [-3, -1, 0],
    sendTime: "10:00",
    recipients: ["evaluator", "owner"],
    template: "{kpi_name} üçün qiymətləndirmə dövrü {date} tarixində başlayır.",
  },
  {
    id: "kpi_deadline_approaching",
    title: "KPI deadline yaxınlaşır",
    description: "KPI dövrünün bitməsinə az qaldıqda mövcud progress haqqında xəbərdarlıq.",
    enabled: true,
    channels: ["in_app", "email"],
    frequency: "daily",
    reminders: [-7, -3, -1],
    sendTime: "09:00",
    recipients: ["owner", "manager"],
    template: "{kpi_name} KPI-sının bitməsinə {days_left} gün qalıb. Cari icra: {progress}%.",
  },
  {
    id: "kpi_overdue",
    title: "KPI gecikmiş (overdue)",
    description: "KPI dövrü bitib, lakin nəticə daxil edilməyib.",
    enabled: true,
    channels: ["in_app", "email", "sms"],
    frequency: "daily",
    reminders: [1, 3, 7],
    sendTime: "09:00",
    recipients: ["owner", "manager", "hr"],
    template: "{kpi_name} KPI-sı {date} tarixində bitib, nəticə hələ daxil edilməyib.",
  },
  {
    id: "bonus_calculation",
    title: "Bonus hesablanması",
    description: "Bonus hesablama dövrünün başlaması və tamamlanması haqqında bildiriş.",
    enabled: true,
    channels: ["in_app", "email"],
    frequency: "on_event",
    reminders: [-2, 0],
    sendTime: "10:00",
    recipients: ["owner", "manager", "hr"],
    template: "{period} dövrü üçün bonus hesablanması başlayır.",
  },
  {
    id: "kpi_review_reminder",
    title: "KPI Review xatırladıcısı",
    description: "Planlaşdırılmış review tarixində iştirakçılara xatırlatma.",
    enabled: true,
    channels: ["in_app", "email"],
    frequency: "on_event",
    reminders: [-1, 0],
    sendTime: "09:00",
    recipients: ["owner", "evaluator", "manager"],
    template: "{kpi_name} üçün review iclası {date} tarixində keçiriləcək.",
  },
  {
    id: "sub_kpi_assign",
    title: "Hədəf təyin etmə (KPI Set)",
    description: "Rəhbər KPI Set modulundan hədəf təyin etdikdə əməkdaşa bildiriş.",
    enabled: true,
    channels: ["in_app", "email"],
    frequency: "on_event",
    reminders: [0],
    sendTime: "09:00",
    recipients: ["owner"],
    template: "Sizə yeni hədəf təyin olundu: {sub_kpi_name}.",
  },
  {
    id: "approval_pending",
    title: "Təsdiq gözləyən KPI",
    description: "Matris əsasında təsdiq mərhələsində olan KPI haqqında təsdiqləyiciyə bildiriş.",
    enabled: true,
    channels: ["in_app", "email"],
    frequency: "daily",
    reminders: [0, 2],
    sendTime: "09:00",
    recipients: ["manager", "hr"],
    template: "Təsdiq gözləyən KPI mövcuddur: {kpi_name}.",
  },
  {
    id: "evaluation_result",
    title: "Qiymətləndirmə nəticəsi",
    description: "Əməkdaşa öz qiymətləndirmə nəticəsinin paylaşılması.",
    enabled: true,
    channels: ["in_app", "email"],
    frequency: "on_event",
    reminders: [0],
    sendTime: "10:00",
    recipients: ["owner"],
    template: "{kpi_name} üzrə qiymətləndirmə nəticəniz hazırdır: {score} bal.",
  },
  {
    id: "monthly_report",
    title: "Aylıq performans hesabatı",
    description: "Hər ayın sonunda ümumi performans icmalı.",
    enabled: false,
    channels: ["email"],
    frequency: "weekly",
    reminders: [0],
    sendTime: "08:00",
    recipients: ["manager", "hr"],
    template: "{period} üzrə aylıq performans hesabatı hazırdır.",
  },
];

const load = (): NotificationSetting[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as NotificationSetting[];
      // migration: missing seeds
      const ids = new Set(parsed.map(p => p.id));
      const missing = SEED.filter(s => !ids.has(s.id));
      if (missing.length === 0) return parsed;
      const next = [...parsed, ...missing];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    }
  } catch {}
  localStorage.setItem(KEY, JSON.stringify(SEED));
  return SEED;
};

const persist = (list: NotificationSetting[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

export const getNotificationSettings = (): NotificationSetting[] => load();

export const updateNotificationSetting = (id: string, patch: Partial<NotificationSetting>) => {
  persist(load().map(n => n.id === id ? { ...n, ...patch } : n));
};

export const useNotificationSettings = (): NotificationSetting[] => {
  const [list, setList] = useState<NotificationSetting[]>(() => load());
  useEffect(() => {
    const r = () => setList(load());
    window.addEventListener(EVT, r);
    window.addEventListener("storage", r);
    return () => {
      window.removeEventListener(EVT, r);
      window.removeEventListener("storage", r);
    };
  }, []);
  return list;
};

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "Sistem daxili",
  email: "Email",
  sms: "SMS",
};

export const RECIPIENT_LABELS: Record<string, string> = {
  owner: "KPI sahibi",
  evaluator: "Qiymətləndirici",
  assigner: "Təyin edən",
  manager: "Rəhbər",
  hr: "HR",
  team: "Komanda üzvləri",
};

export const FREQUENCY_LABELS: Record<NotificationSetting["frequency"], string> = {
  once: "Bir dəfəlik",
  daily: "Gündəlik",
  weekly: "Həftəlik",
  on_event: "Hadisə baş verdikdə",
};
