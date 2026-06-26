// Lightweight in-browser notification feed. All panels read from the same source,
// scoped by recipient employee id. Used to surface approval requests, goal updates, etc.

import { useEffect, useState } from "react";

export type NotificationType =
  | "approval_request"
  | "approval_result"
  | "goal_assigned"
  | "execution_update"
  | "whistleblower";

export interface NotificationItem {
  id: string;
  toEmployeeId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const KEY = "kpi_notifications_v1";
const EVT = "kpi-notifications-updated";

const load = (): NotificationItem[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seed: NotificationItem[] = [
    {
      id: "n-seed-1",
      toEmployeeId: "e8",
      type: "approval_request",
      title: "Təsdiq tələbi: Müştəri Məmnuniyyəti",
      body: "Sistem Təsdiqləri modulunda yeni kart gözləyir.",
      link: "/manager/sistem-tesdiq",
      read: false,
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: "n-seed-2",
      toEmployeeId: "e4",
      type: "goal_assigned",
      title: "Yeni hədəf: Aylıq Satış Hədəfi",
      body: "Sizə yeni KPI hədəfi təyin edildi.",
      link: "/user/kpi-kartlari",
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ];
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
};

const save = (list: NotificationItem[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVT));
};

export const getNotifications = (): NotificationItem[] => load();

export const pushNotification = (input: Omit<NotificationItem, "id" | "read" | "createdAt">) => {
  const list = load();
  list.unshift({ ...input, id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString() });
  save(list);
};

export const markRead = (id: string) => {
  const list = load().map(n => n.id === id ? { ...n, read: true } : n);
  save(list);
};

export const markAllRead = (employeeId: string) => {
  const list = load().map(n => n.toEmployeeId === employeeId ? { ...n, read: true } : n);
  save(list);
};

export const useNotificationsFor = (employeeId: string | null): NotificationItem[] => {
  const [rows, setRows] = useState<NotificationItem[]>(() => load());
  useEffect(() => {
    const h = () => setRows(load());
    window.addEventListener(EVT, h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener(EVT, h); window.removeEventListener("storage", h); };
  }, []);
  if (!employeeId) return [];
  return rows.filter(n => n.toEmployeeId === employeeId);
};
