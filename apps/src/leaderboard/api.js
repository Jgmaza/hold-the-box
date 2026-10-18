// Cliente del leaderboard (Edge Function Supabase). Si no hay URL/key, las llamadas fallan en silencio.
import { computeScore, isCampaignLevel } from './score.js';

const DEFAULT_URL = 'https://pnzkrbdlrtukthyrvdri.supabase.co/functions/v1/leaderboard';

export function leaderboardConfigured() {
  return !!(import.meta.env.VITE_LEADERBOARD_URL || DEFAULT_URL);
}

function endpoint() {
  return (import.meta.env.VITE_LEADERBOARD_URL || DEFAULT_URL).replace(/\/$/, '');
}

function headers() {
  const h = { 'Content-Type': 'application/json' };
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (key) {
    h.Authorization = `Bearer ${key}`;
    h.apikey = key;
  }
  return h;
}

async function request(pathQuery, { method = 'GET', body } = {}) {
  const url = `${endpoint()}${pathQuery}`;
  try {
    const res = await fetch(url, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('[leaderboard]', res.status, data.error ?? data);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('[leaderboard] red', e);
    return null;
  }
}

/** Envía el score de una victoria de campaña. Devuelve status { bests, total, canSave, saved } o null. */
export async function submitWin(levelId, win) {
  if (!isCampaignLevel(levelId)) return null;
  const score = computeScore(win);
  return request('', {
    method: 'POST',
    body: {
      action: 'score',
      level: levelId,
      score,
      time: win.time,
      integrity: win.integrity,
      wetness: win.wetness,
    },
  });
}

export async function saveArcade(name, role) {
  return request('', {
    method: 'POST',
    body: { action: 'save', name, role },
  });
}

export async function fetchBoard(limit = 10) {
  const data = await request(`?action=board&limit=${limit}`);
  return data?.board ?? null;
}

export async function fetchMe() {
  return request('', { method: 'POST', body: { action: 'me' } });
}
