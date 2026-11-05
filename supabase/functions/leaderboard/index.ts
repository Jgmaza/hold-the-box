// Leaderboard arcade por IP (sin cuentas). verify_jwt = false; identidad = hash de la IP.
// GET  ?action=board&scope=general|muelle|bahia|aldea|aldea2|campamento&limit=10
// POST { action: "score", level, score, time, integrity, wetness }
// POST { action: "save", name, role }  — una sola vez, al inicio (no exige todos los mapas)
// POST { action: "me" }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const LEVELS = ["muelle", "bahia", "aldea", "aldea2", "campamento"] as const;
type Level = (typeof LEVELS)[number];
const SCOPES = ["general", ...LEVELS] as const;
type Scope = (typeof SCOPES)[number];
const ROLES = new Set(["CARGADOR", "CAPITAN", "GRUMETE", "PIRATA"]);
const SCORE_COL = Object.fromEntries(LEVELS.map((l) => [l, `score_${l}`])) as Record<Level, string>;
const TIME_COL = Object.fromEntries(LEVELS.map((l) => [l, `time_${l}`])) as Record<Level, string>;

/** Scores y tiempos que ya tenía esta IP (para no borrarlos al hacer upsert). */
function carry(existing: Record<string, unknown> | null | undefined) {
  const out: Record<string, unknown> = {};
  for (const l of LEVELS) {
    out[SCORE_COL[l]] = Number(existing?.[SCORE_COL[l]] ?? 0);
    out[TIME_COL[l]] = existing?.[TIME_COL[l]] ?? null;
  }
  return out;
}

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
  return Object.fromEntries(LEVELS.map((l) => [l, Number(row?.[SCORE_COL[l]] ?? 0)])) as Record<Level, number>;
}

function statusOf(row: Record<string, unknown> | null | undefined) {
  const b = bests(row);
  return {
    bests: b,
    total: Number(row?.total ?? LEVELS.reduce((sum, l) => sum + b[l], 0)),
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
      const scopeRaw = String(url.searchParams.get("scope") ?? body.scope ?? "general");
      const scope = (SCOPES.includes(scopeRaw as Scope) ? scopeRaw : "general") as Scope;
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? body.limit ?? 10)));
      const supabase = db();

      if (scope === "general") {
        const { data, error } = await supabase
          .from("arcade_records")
          .select(`name, role, ${LEVELS.map((l) => SCORE_COL[l]).join(", ")}, total`)
          .not("name", "is", null)
          .gt("total", 0)
          .order("total", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return json({
          scope,
          board: (data ?? []).map((r: Record<string, unknown>, i) => ({
            rank: i + 1,
            name: r.name,
            role: r.role,
            ...Object.fromEntries(LEVELS.map((l) => [l, r[SCORE_COL[l]]])),
            total: r.total,
          })),
        });
      }

      const col = SCORE_COL[scope];
      const tcol = TIME_COL[scope];
      const { data, error } = await supabase
        .from("arcade_records")
        .select(`name, role, ${col}, ${tcol}`)
        .not("name", "is", null)
        .gt(col, 0)
        .order(col, { ascending: false })
        .limit(limit);
      if (error) throw error;
      return json({
        scope,
        board: (data ?? []).map((r, i) => ({
          rank: i + 1,
          name: r.name,
          role: r.role,
          score: Number(r[col] ?? 0),
          time: r[tcol] ?? null,
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

      const patch: Record<string, unknown> = {
        ip_hash: ipHash,
        ...carry(existing),
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
      // Nombre una sola vez: si ya hay, no se cambia.
      if (existing?.name) return json({ saved: true, already: true, ...statusOf(existing) });

      const name = String(body.name ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);
      const role = String(body.role ?? "").toUpperCase();
      if (name.length < 3 || name.length > 8) return json({ error: "bad_name" }, 400);
      if (!ROLES.has(role)) return json({ error: "bad_role" }, 400);

      const patch: Record<string, unknown> = {
        ip_hash: ipHash,
        name,
        role,
        ...carry(existing),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("arcade_records").upsert(patch, { onConflict: "ip_hash" }).select("*").single();
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
