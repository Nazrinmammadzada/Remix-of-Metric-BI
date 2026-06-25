import {
  CategoryKey,
  CURRENT_CYCLE_ID,
  EVALUATION_CATEGORIES,
  mockEmployees,
} from "@/data/mockData";

export interface PeerSubmission {
  cycleId: string;
  reviewerId: string;
  revieweeId: string;
  scores: Record<CategoryKey, number>;
  comment: string;
  submittedAt: number;
}

const STORAGE_KEY = "peer_reviews_v1";
const SEED_KEY = "peer_reviews_seed_v2";


const read = (): PeerSubmission[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const write = (rows: PeerSubmission[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
};

export const submitPeerReviews = (subs: Omit<PeerSubmission, "submittedAt">[]) => {
  const all = read();
  // Replace any prior submissions from same reviewer in same cycle for same reviewees
  const filtered = all.filter(
    (r) =>
      !subs.some(
        (s) =>
          s.cycleId === r.cycleId &&
          s.reviewerId === r.reviewerId &&
          s.revieweeId === r.revieweeId
      )
  );
  const now = Date.now();
  write([...filtered, ...subs.map((s) => ({ ...s, submittedAt: now }))]);
};

export const getReviewsForReviewee = (
  revieweeId: string,
  cycleId: string = CURRENT_CYCLE_ID
): PeerSubmission[] => read().filter((r) => r.revieweeId === revieweeId && r.cycleId === cycleId);

export const getAverageForReviewee = (
  revieweeId: string,
  cycleId: string = CURRENT_CYCLE_ID
): { overall: number | null; perCategory: Record<string, number>; count: number } => {
  const rows = getReviewsForReviewee(revieweeId, cycleId);
  if (rows.length === 0) return { overall: null, perCategory: {}, count: 0 };
  const cats: Record<string, number[]> = {};
  rows.forEach((r) => {
    Object.entries(r.scores).forEach(([k, v]) => {
      (cats[k] ||= []).push(v);
    });
  });
  const perCategory: Record<string, number> = {};
  Object.entries(cats).forEach(([k, arr]) => {
    perCategory[k] = arr.reduce((a, b) => a + b, 0) / arr.length;
  });
  const all = Object.values(perCategory);
  const overall = all.reduce((a, b) => a + b, 0) / all.length;
  return { overall, perCategory, count: rows.length };
};

export const hasReviewerSubmitted = (
  reviewerId: string,
  cycleId: string = CURRENT_CYCLE_ID
): boolean => read().some((r) => r.reviewerId === reviewerId && r.cycleId === cycleId);

// ---- Deterministic seeding so demo accounts appear "already reviewed by others" ----
const seedHash = (s: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % 2147483647 || 1;
};
const nextRand = (seed: number) => {
  const s = (seed * 9301 + 49297) % 233280;
  return { seed: s, value: s / 233280 };
};

export const seedReviewsForEmployee = (
  revieweeId: string,
  reviewerCount = 4,
  cycleId: string = CURRENT_CYCLE_ID
) => {
  const all = read();
  if (all.some((r) => r.revieweeId === revieweeId && r.cycleId === cycleId)) return;

  const candidates = mockEmployees.filter((e) => e.id !== revieweeId);
  let seed = seedHash(`${cycleId}-seed-${revieweeId}`);
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const r = nextRand(seed); seed = r.seed;
    const j = Math.floor(r.value * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const reviewers = shuffled.slice(0, Math.min(reviewerCount, shuffled.length));

  const submissions: PeerSubmission[] = reviewers.map((rev) => {
    const scores = {} as Record<CategoryKey, number>;
    EVALUATION_CATEGORIES.forEach((c) => {
      const r = nextRand(seed); seed = r.seed;
      const raw = 3 + r.value * 2;
      scores[c.key] = Math.round(raw * 2) / 2;
    });
    return {
      cycleId,
      reviewerId: `anon-${rev.id}`,
      revieweeId,
      scores,
      comment: "",
      submittedAt: Date.now(),
    };
  });

  write([...all, ...submissions]);
};

export const bootstrapDemoReviews = (revieweeIds: string[]) => {
  if (localStorage.getItem(SEED_KEY) === "done") {
    revieweeIds.forEach((id) => seedReviewsForEmployee(id));
    return;
  }
  revieweeIds.forEach((id) => seedReviewsForEmployee(id));
  localStorage.setItem(SEED_KEY, "done");
};
