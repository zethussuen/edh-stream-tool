import type {
  TopDeckConfig,
  TopDeckTournament,
  TopDeckStanding,
  TopDeckRound,
  TopDeckPlayer,
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

export async function getTournament(
  config: TopDeckConfig,
): Promise<TopDeckTournament> {
  return post("/tournament", {
    apiKey: config.apiKey,
    tid: config.tournamentId,
  });
}

export async function getStandings(
  config: TopDeckConfig,
): Promise<TopDeckStanding[]> {
  return post("/standings", {
    apiKey: config.apiKey,
    tid: config.tournamentId,
  });
}

export async function getLatestRound(
  config: TopDeckConfig,
): Promise<TopDeckRound> {
  return post("/rounds/latest", {
    apiKey: config.apiKey,
    tid: config.tournamentId,
  });
}

export async function getPlayer(
  config: TopDeckConfig,
  playerId: string,
): Promise<TopDeckPlayer> {
  return post("/player", {
    apiKey: config.apiKey,
    tid: config.tournamentId,
    playerId,
  });
}
