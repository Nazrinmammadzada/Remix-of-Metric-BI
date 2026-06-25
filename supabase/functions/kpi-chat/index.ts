import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Sən KPI (Key Performance Indicator) və performans idarəetmə üzrə peşəkar köməkçisən. 
İstifadəçilərə Azərbaycan dilində, qısa, aydın və praktik cavablar ver. 
Cavablarda markdown istifadə et (başlıqlar, siyahılar, qalın mətn). 
KPI nümunələri verərkən real biznes kontekstindən istifadə et: satış, HR, marketinq, maliyyə, IT və s.`;

// Input limits to prevent abuse / unbounded AI cost
const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 4000;
const MAX_TOTAL_CHARS = 30000;
const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);

// Simple in-memory per-IP rate limit (best-effort; resets when the
// function instance recycles). Compensating control for the public endpoint.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQ = 15;
const ipHits = new Map<string, number[]>();

const tooManyRequests = (ip: string): boolean => {
  const now = Date.now();
  const arr = (ipHits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  ipHits.set(ip, arr);
  return arr.length > RATE_MAX_REQ;
};

const jsonError = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    if (tooManyRequests(ip)) {
      return jsonError(429, "Çox sayda sorğu. Bir az gözləyin və yenidən cəhd edin.");
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "Yanlış sorğu formatı.");
    }

    const messages = (body as { messages?: unknown })?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonError(400, "Mesaj siyahısı tələb olunur.");
    }
    if (messages.length > MAX_MESSAGES) {
      return jsonError(400, `Maksimum ${MAX_MESSAGES} mesaj göndərə bilərsiniz.`);
    }

    let total = 0;
    const sanitised = messages.map((m: any) => {
      const role = ALLOWED_ROLES.has(m?.role) ? m.role : "user";
      const content = String(m?.content ?? "").slice(0, MAX_CONTENT_CHARS);
      total += content.length;
      return { role, content };
    });
    if (total > MAX_TOTAL_CHARS) {
      return jsonError(400, "Mesaj həcmi çox böyükdür.");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...sanitised],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonError(429, "Çox sayda sorğu. Bir az gözləyin və yenidən cəhd edin.");
      }
      if (response.status === 402) {
        return jsonError(402, "AI kreditləri bitib. Workspace ayarlarından əlavə edin.");
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return jsonError(500, "AI xidmətində xəta baş verdi.");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("kpi-chat unhandled:", e);
    return jsonError(500, "Daxili xəta baş verdi.");
  }
});
