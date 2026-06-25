// Evaluation config store: score scales + assignment status tracking
const SCALES_KEY = "kpi_eval_scales_v2";
const LEGACY_KEY = "kpi_eval_scale_v1";

export interface ScoreScale {
  id: string;
  label: string;
  min: number;
  max: number;
  isDefault?: boolean;
}

const DEFAULT_SCALES: ScoreScale[] = [
  { id: "scale_1_5", label: "1 – 5", min: 1, max: 5, isDefault: true },
];

const seed = (): ScoreScale[] => {
  // migrate legacy single-scale value if present
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const legacy = JSON.parse(raw);
      if (typeof legacy?.min === "number" && typeof legacy?.max === "number") {
        return [{
          id: `scale_${legacy.min}_${legacy.max}`,
          label: `${legacy.min} – ${legacy.max}`,
          min: legacy.min, max: legacy.max, isDefault: true,
        }];
      }
    }
  } catch {}
  return DEFAULT_SCALES;
};

export const getScoreScales = (): ScoreScale[] => {
  try {
    const raw = localStorage.getItem(SCALES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const init = seed();
  localStorage.setItem(SCALES_KEY, JSON.stringify(init));
  return init;
};

const persist = (list: ScoreScale[]) => {
  localStorage.setItem(SCALES_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("eval-config-updated"));
};

export const setScoreScales = (list: ScoreScale[]) => persist(list);

export const addScoreScale = (s: Omit<ScoreScale, "id">) => {
  const list = getScoreScales();
  const next: ScoreScale = { ...s, id: `scale_${Date.now()}` };
  list.push(next);
  persist(list);
  return next;
};

export const removeScoreScale = (id: string) => {
  const list = getScoreScales().filter(s => s.id !== id);
  // ensure at least one and a default exists
  if (list.length === 0) list.push(DEFAULT_SCALES[0]);
  if (!list.some(s => s.isDefault)) list[0].isDefault = true;
  persist(list);
};

export const setDefaultScale = (id: string) => {
  const list = getScoreScales().map(s => ({ ...s, isDefault: s.id === id }));
  persist(list);
};

export const getDefaultScale = (): ScoreScale => {
  const list = getScoreScales();
  return list.find(s => s.isDefault) || list[0] || DEFAULT_SCALES[0];
};

export const getScaleById = (id: string | undefined | null): ScoreScale | null => {
  if (!id) return null;
  return getScoreScales().find(s => s.id === id) || null;
};

// ---- back-compat (single scale API) ----
export const getScoreScale = (): { min: number; max: number } => {
  const d = getDefaultScale();
  return { min: d.min, max: d.max };
};

export const setScoreScale = (s: { min: number; max: number }) => {
  const list = getScoreScales();
  const def = list.find(x => x.isDefault) || list[0];
  if (def) {
    def.min = s.min; def.max = s.max; def.label = `${s.min} – ${s.max}`;
    persist(list);
  }
};
