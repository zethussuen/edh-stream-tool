import { SCRYFALL_RATE_LIMIT_MS } from "./constants";
import type { ScryfallCard } from "./types";

const BASE_URL = "https://api.scryfall.com";
const HEADERS = {
  Accept: "application/json",
  "User-Agent": "cEDHStreamTool/1.0",
};

let lastRequest = 0;

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, SCRYFALL_RATE_LIMIT_MS - (now - lastRequest));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
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
    typeLine: raw.type_line ?? "",
    oracleText: raw.oracle_text ?? frontFace?.oracle_text ?? "",
    artist: raw.artist ?? "",
    setName: raw.set_name ?? "",
    rarity: raw.rarity ?? "",
    colors: raw.colors ?? frontFace?.colors ?? [],
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
