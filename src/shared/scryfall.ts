import { SCRYFALL_RATE_LIMIT_MS } from "./constants";
import type { ScryfallCard } from "./types";

const BASE_URL = "https://api.scryfall.com";
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "cEDHStreamTool/1.0",
};

let lastRequest = 0;

async function waitForRateLimit() {
  const now = Date.now();
  const wait = Math.max(0, SCRYFALL_RATE_LIMIT_MS - (now - lastRequest));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

async function throttledFetch(url: string): Promise<Response> {
  await waitForRateLimit();
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { details?: string }).details ||
        `Scryfall error: ${res.status}`,
    );
  }
  return res;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCard(raw: any): ScryfallCard {
  const faces = raw.card_faces;
  const hasMultipleFaces = Array.isArray(faces) && faces.length > 1;
  const frontFace = hasMultipleFaces ? faces[0] : null;

  // Double-faced cards have image_uris on card_faces, not at top level
  const imgs = raw.image_uris ?? frontFace?.image_uris ?? {};

  return {
    scryfallId: raw.id,
    name: raw.name,
    manaCost: raw.mana_cost ?? frontFace?.mana_cost ?? "",
    cmc: raw.cmc ?? 0,
    typeLine: raw.type_line ?? "",
    oracleText: raw.oracle_text ?? frontFace?.oracle_text ?? "",
    artist: raw.artist ?? "",
    setName: raw.set_name ?? "",
    rarity: raw.rarity ?? "",
    colors: raw.colors ?? frontFace?.colors ?? [],
    colorIdentity: raw.color_identity ?? [],
    power: raw.power ?? frontFace?.power ?? null,
    toughness: raw.toughness ?? frontFace?.toughness ?? null,
    keywords: raw.keywords ?? [],
    imageUri: imgs.normal ?? "",
    imageUriLarge: imgs.large ?? "",
    imageUriSmall: imgs.small ?? "",
    artCropUri: imgs.art_crop ?? "",
    borderCropUri: imgs.border_crop ?? "",
    doubleFaced: hasMultipleFaces,
    backFace: hasMultipleFaces
      ? {
          name: faces[1].name,
          imageUri: faces[1].image_uris?.normal ?? "",
          artCropUri: faces[1].image_uris?.art_crop ?? "",
        }
      : null,
  };
}

export async function autocomplete(query: string): Promise<string[]> {
  const res = await throttledFetch(
    `${BASE_URL}/cards/autocomplete?q=${encodeURIComponent(query)}`,
  );
  const data = await res.json();
  return (data as { data: string[] }).data ?? [];
}

export async function search(
  query: string,
  limit = 20,
): Promise<ScryfallCard[]> {
  const res = await throttledFetch(
    `${BASE_URL}/cards/search?q=${encodeURIComponent(query)}&unique=cards&order=edhrec`,
  );
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cards = ((data as any).data ?? []) as any[];
  return cards.slice(0, limit).map(mapCard);
}

export async function getByName(name: string): Promise<ScryfallCard> {
  const res = await throttledFetch(
    `${BASE_URL}/cards/named?fuzzy=${encodeURIComponent(name)}`,
  );
  return mapCard(await res.json());
}

export async function getById(id: string): Promise<ScryfallCard> {
  const res = await throttledFetch(`${BASE_URL}/cards/${encodeURIComponent(id)}`);
  return mapCard(await res.json());
}

// In-memory cache for collection results (keyed by oracle ID)
const collectionCache = new Map<string, ScryfallCard>();

/**
 * Batch-fetch cards using Scryfall's collection endpoint.
 * Accepts oracle IDs (from TopDeck deckObj). Results are cached in memory
 * so repeated lookups (e.g. same commanders across name plates + deck view) skip the API.
 * Fetches up to 75 per request (Scryfall's limit).
 */
export async function getCollection(
  oracleIds: string[],
): Promise<Map<string, ScryfallCard>> {
  const results = new Map<string, ScryfallCard>();
  const uncached: string[] = [];

  for (const id of oracleIds) {
    const hit = collectionCache.get(id);
    if (hit) {
      results.set(id, hit);
    } else {
      uncached.push(id);
    }
  }

  if (uncached.length === 0) return results;

  const BATCH_SIZE = 75;

  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    const identifiers = batch.map((id) => ({ oracle_id: id }));

    await waitForRateLimit();

    const res = await fetch(`${BASE_URL}/cards/collection`, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ identifiers }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        (body as { details?: string }).details ||
          `Scryfall collection error: ${res.status}`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as { data: any[]; not_found: any[] };
    for (const raw of data.data) {
      const card = mapCard(raw);
      if (raw.oracle_id) {
        collectionCache.set(raw.oracle_id, card);
        results.set(raw.oracle_id, card);
      }
    }
  }

  return results;
}
