// Browser-side TopDeck.gg client. Requests go to our own Express proxy at
// `/api/topdeck/*` rather than `https://topdeck.gg/api` directly so the
// API key stays server-side and never appears in the browser's network tab.

import type {
  TopDeckConfig,
  TopDeckTournament,
  TopDeckStanding,
  TopDeckRound,
  TopDeckTable,
  TopDeckPlayerDetail,
  TopDeckAttendee,
} from "./types";

async function post<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`/api/topdeck${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TopDeck API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Cache ──
// Responses are persisted to localStorage so a page reload doesn't burn a
// fresh API call. There's no automatic expiry — the user pulls fresh data
// via the "Pull Latest" button, which calls through with forceRefresh=true.

interface CacheEntry<T> {
  data: T;
  fetchedAt: number; // Date.now()
  tid: string;
}

const CACHE_PREFIX = "topdeck-cache:";

function cacheKey(tid: string, endpoint: string): string {
  return `${CACHE_PREFIX}${tid}:${endpoint}`;
}

function readCache<T>(tid: string, endpoint: string): CacheEntry<T> | null {
  try {
    const raw = localStorage.getItem(cacheKey(tid, endpoint));
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

function writeCache<T>(tid: string, endpoint: string, data: T): CacheEntry<T> {
  const entry: CacheEntry<T> = { data, fetchedAt: Date.now(), tid };
  try {
    localStorage.setItem(cacheKey(tid, endpoint), JSON.stringify(entry));
  } catch {
    // localStorage full / disabled / private-mode quota exceeded — swallow
    // and return the entry anyway so the caller still gets fresh data this
    // session. We just lose the persistence benefit until the user clears.
  }
  return entry;
}

/** Returns cached data if available, otherwise fetches fresh. */
async function cachedFetch<T>(
  config: TopDeckConfig,
  endpoint: string,
  fetcher: () => Promise<T>,
  forceRefresh: boolean,
): Promise<{ data: T; fetchedAt: number; fromCache: boolean }> {
  const tid = config.tournamentId;

  if (!forceRefresh) {
    const cached = readCache<T>(tid, endpoint);
    if (cached) {
      return { data: cached.data, fetchedAt: cached.fetchedAt, fromCache: true };
    }
  }

  const data = await fetcher();
  const entry = writeCache(tid, endpoint, data);
  return { data: entry.data, fetchedAt: entry.fetchedAt, fromCache: false };
}

export interface CachedResult<T> {
  data: T;
  fetchedAt: number;
  fromCache: boolean;
}

// ── Public API ──

export async function getTournament(
  config: TopDeckConfig,
  forceRefresh = false,
): Promise<CachedResult<TopDeckTournament>> {
  return cachedFetch(config, "tournament", () =>
    post<TopDeckTournament>("/tournament", {
      apiKey: config.apiKey,
      tid: config.tournamentId,
      room: config.room,
    }),
    forceRefresh,
  );
}

export async function getStandings(
  config: TopDeckConfig,
  forceRefresh = false,
): Promise<CachedResult<TopDeckStanding[]>> {
  return cachedFetch(config, "standings", () =>
    post<TopDeckStanding[]>("/standings", {
      apiKey: config.apiKey,
      tid: config.tournamentId,
      room: config.room,
    }),
    forceRefresh,
  );
}

// TopDeck's `/rounds/latest` returns just the tables — no round number. We
// fan out to `/rounds` in parallel to grab the round label from the last
// entry and synthesize a complete TopDeckRound object for the UI.
export async function getLatestRound(
  config: TopDeckConfig,
  forceRefresh = false,
): Promise<CachedResult<TopDeckRound>> {
  return cachedFetch(config, "rounds-latest", async () => {
    const body = { apiKey: config.apiKey, tid: config.tournamentId, room: config.room };
    const [tables, rounds] = await Promise.all([
      post<TopDeckTable[]>("/rounds/latest", body),
      post<TopDeckRound[]>("/rounds", body),
    ]);
    const roundNum = rounds.length > 0 ? rounds[rounds.length - 1].round : rounds.length;
    return { round: roundNum, tables };
  }, forceRefresh);
}

export async function getPlayer(
  config: TopDeckConfig,
  playerId: string,
): Promise<TopDeckPlayerDetail> {
  return post("/player", {
    apiKey: config.apiKey,
    tid: config.tournamentId,
    playerId,
    room: config.room,
  });
}

export async function getAttendees(
  config: TopDeckConfig,
  forceRefresh = false,
): Promise<CachedResult<TopDeckAttendee[]>> {
  return cachedFetch(config, "attendees", () =>
    post<TopDeckAttendee[]>("/attendees", {
      apiKey: config.apiKey,
      tid: config.tournamentId,
      room: config.room,
    }),
    forceRefresh,
  );
}

/** Clear all cached data for a tournament. */
export function clearCache(tid: string): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${CACHE_PREFIX}${tid}:`)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * Map a player-detail response to match-level W-L-D. In cEDH a match is one
 * game (no best-of-3), so `gamesWon`/`gamesLost`/`gamesDrawn` are the match
 * record. The standings endpoint's wins/losses are unreliable mid-tournament
 * (Swiss vs bracket phase quirks), so prefer this when you need the record.
 */
export function recordFromPlayerDetail(
  detail: TopDeckPlayerDetail | null | undefined,
): { wins: number; losses: number; draws: number } {
  return {
    wins: detail?.gamesWon ?? 0,
    losses: detail?.gamesLost ?? 0,
    draws: detail?.gamesDrawn ?? 0,
  };
}

/** Format a fetchedAt timestamp as a human-readable relative string. */
export function formatCacheAge(fetchedAt: number): string {
  const diff = Date.now() - fetchedAt;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
