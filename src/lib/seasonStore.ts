// Evaluation season open/close state
const KEY = "kpi_eval_season_open_v1";

export const getSeasonOpen = (): boolean => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

export const setSeasonOpen = (open: boolean) => {
  localStorage.setItem(KEY, open ? "1" : "0");
  window.dispatchEvent(new Event("season-updated"));
};
