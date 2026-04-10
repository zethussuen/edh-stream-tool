import type { ScrollrackValidation, ScryfallCard } from "./types";
import { getByName } from "./scryfall";

const SCROLLRACK_URL = "https://scrollrack.topdeck.gg/api/validate";

export async function validateDeck(
  rawText: string,
): Promise<ScrollrackValidation> {
  const res = await fetch(SCROLLRACK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game: "mtg", format: "commander", list: rawText }),
  });
  if (!res.ok) {
    throw new Error(`Scrollrack error: ${res.status}`);
  }
  return res.json();
}

/** Fallback parser: extract card names from raw text lines */
export function parseRawDecklist(
  rawText: string,
): { quantity: number; name: string }[] {
  const lines = rawText.split("\n");
  const cards: { quantity: number; name: string }[] = [];
  const lineRegex = /^(\d+)\s+(.+)$/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("~~")) continue;
    const match = trimmed.match(lineRegex);
    if (match) {
      cards.push({ quantity: parseInt(match[1], 10), name: match[2].trim() });
    }
  }
  return cards;
}

/** Fallback: resolve card names via Scryfall fuzzy search */
export async function resolveCardNames(
  entries: { quantity: number; name: string }[],
  onCard?: (card: ScryfallCard, index: number) => void,
): Promise<ScryfallCard[]> {
  const results: ScryfallCard[] = [];
  for (let i = 0; i < entries.length; i++) {
    try {
      const card = await getByName(entries[i].name);
      results.push(card);
      onCard?.(card, i);
    } catch {
      // Skip cards that can't be resolved
    }
  }
  return results;
}
