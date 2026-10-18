// Leaderboard arcade por IP (sin cuentas). verify_jwt = false; identidad = hash de la IP.
// GET  ?action=board&limit=10
// POST { action: "score", level, score, time, integrity, wetness }
// POST { action: "save", name, role }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const LEVELS = ["muelle", "bahia", "tormenta"] as const;
type Level = (typeof LEVELS)[number];
const ROLES = new Set(["CARGADOR", "CAPITAN", "GRUMETE", "PIRATA"]);
const SCORE_COL: Record<Level, string> = {
  muelle: "score_muelle",
  bahia: "score_bahia",
  tormenta: "score_tormenta",
};
const TIME_COL: Record<Level, string> = {
  muelle: "time_muelle",
  bahia: "time_bahia",
  tormenta: "time_tormenta",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const rate = new Map<string, number>();

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0"
  );
}

function db() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

function bests(row: Record<string, unknown> | null | undefined) {
  return {
    muelle: Number(row?.score_muelle ?? 0),
    bahia: Number(row?.score_bahia ?? 0),
    tormenta: Number(row?.score_tormenta ?? 0),
  };
}

function statusOf(row: Record<string, unknown> | null | undefined) {
  const b = bests(row);
  return {
    bests: b,
    total: Number(row?.total ?? b.muelle + b.bahia + b.tormenta),
    canSave: LEVELS.every((l) => b[l] > 0),
    saved: !!row?.name,
    name: (row?.name as string) ?? null,
    role: (row?.role as string) ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const url = new URL(req.url);
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    }
    const action = req.method === "GET" ? (url.searchParams.get("action") ?? "board") : String(body.action ?? "");

    if (action === "board") {
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? body.limit ?? 10)));
      const { data, error } = await db()
        .from("arcade_records")
        .select("name, role, score_muelle, score_bahia, score_tormenta, total")
        .not("name", "is", null)
        .order("total", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json({
        board: (data ?? []).map((r, i) => ({
          rank: i + 1,
          name: r.name,
          role: r.role,
          muelle: r.score_muelle,
          bahia: r.score_bahia,
          tormenta: r.score_tormenta,
          total: r.total,
        })),
      });
    }

    const salt = Deno.env.get("LEADERBOARD_SALT") ?? "no-sueltes-la-caja";
    const ipHash = await sha256(`${salt}:${clientIp(req)}`);
    const now = Date.now();
    if (now - (rate.get(ipHash) ?? 0) < 2000) return json({ error: "rate_limit" }, 429);
    rate.set(ipHash, now);

    const supabase = db();
    const { data: existing } = await supabase.from("arcade_records").select("*").eq("ip_hash", ipHash).maybeSingle();

    if (action === "score") {
      const level = String(body.level ?? "") as Level;
      if (!LEVELS.includes(level)) return json({ error: "bad_level" }, 400);
      const score = Math.round(Number(body.score));
      const time = Number(body.time);
      if (!Number.isFinite(score) || !Number.isFinite(time)) return json({ error: "bad_score" }, 400);

      const col = SCORE_COL[level];
      const tcol = TIME_COL[level];
      const prev = Number(existing?.[col] ?? 0);
      if (score <= prev && existing) return json({ improved: false, ...statusOf(existing) });

      // Merge completo para no pisar los otros mapas en el upsert.
      const patch: Record<string, unknown> = {
        ip_hash: ipHash,
        score_muelle: Number(existing?.score_muelle ?? 0),
        score_bahia: Number(existing?.score_bahia ?? 0),
        score_tormenta: Number(existing?.score_tormenta ?? 0),
        time_muelle: existing?.time_muelle ?? null,
        time_bahia: existing?.time_bahia ?? null,
        time_tormenta: existing?.time_tormenta ?? null,
        name: existing?.name ?? null,
        role: existing?.role ?? null,
        [col]: score,
        [tcol]: time,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("arcade_records").upsert(patch, { onConflict: "ip_hash" }).select("*").single();
      if (error) throw error;
      return json({ improved: true, ...statusOf(data) });
    }

    if (action === "save") {
      if (!existing) return json({ error: "no_scores" }, 400);
      const st = statusOf(existing);
      if (!st.canSave) return json({ error: "incomplete" }, 400);
      const name = String(body.name ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);
      const role = String(body.role ?? "").toUpperCase();
      if (name.length < 3 || name.length > 8) return json({ error: "bad_name" }, 400);
      if (!ROLES.has(role)) return json({ error: "bad_role" }, 400);

      const { data, error } = await supabase
        .from("arcade_records")
        .update({ name, role, updated_at: new Date().toISOString() })
        .eq("ip_hash", ipHash)
        .select("*")
        .single();
      if (error) throw error;
      return json({ saved: true, ...statusOf(data) });
    }

    if (action === "me") {
      return json(statusOf(existing));
    }

    return json({ error: "bad_action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
