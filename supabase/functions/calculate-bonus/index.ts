// Deterministic bonus calculation edge function.
// POST body: { salary: number, weights: Array<{ weight: number; score: number }>, bonusPct?: number, capPct?: number }
// Returns:   { totalWeight, weightedScore, achievement, bonusPct, bonusAmount, breakdown }
//
// Formulas (deterministic — same input always yields same output):
//   weightedScore = Σ (weight_i * score_i) / Σ (weight_i)
//   achievement   = clamp(weightedScore / 100, 0, capPct/100)
//   bonusAmount   = round2(salary * (bonusPct/100) * achievement)

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

interface TargetInput { weight: number; score: number; name?: string }
interface Body {
  salary: number;
  weights: TargetInput[];
  bonusPct?: number;   // default 20
  capPct?: number;     // default 150 (achievement cap %)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const salary = Number(body.salary) || 0;
  const bonusPct = Number.isFinite(body.bonusPct) ? Number(body.bonusPct) : 20;
  const capPct   = Number.isFinite(body.capPct)   ? Number(body.capPct)   : 150;
  const items = Array.isArray(body.weights) ? body.weights : [];

  if (salary < 0 || bonusPct < 0 || capPct < 0) {
    return new Response(JSON.stringify({ error: "Negative inputs not allowed" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const totalWeight = items.reduce((s, t) => s + (Number(t.weight) || 0), 0);
  const weightedSum = items.reduce((s, t) => s + (Number(t.weight) || 0) * (Number(t.score) || 0), 0);
  const weightedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  const achievement = clamp(weightedScore / 100, 0, capPct / 100);
  const bonusAmount = round2(salary * (bonusPct / 100) * achievement);

  const breakdown = items.map((t) => ({
    name: t.name ?? null,
    weight: Number(t.weight) || 0,
    score: Number(t.score) || 0,
    contribution: totalWeight > 0
      ? round2(((Number(t.weight) || 0) * (Number(t.score) || 0)) / totalWeight)
      : 0,
  }));

  return new Response(JSON.stringify({
    salary,
    totalWeight,
    weightedScore: round2(weightedScore),
    achievement: round2(achievement * 100), // %
    bonusPct,
    capPct,
    bonusAmount,
    breakdown,
    computedAt: new Date().toISOString(),
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
