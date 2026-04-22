import type { ScryfallCard, SpotlightData } from "./types";
import { DEFAULT_CARD_HEIGHT, DEFAULT_CARD_WIDTH, OVERLAY_HEIGHT, OVERLAY_WIDTH } from "./constants";

export function randomCardPosition(): { x: number; y: number } {
  return {
    x: Math.round(Math.random() * (OVERLAY_WIDTH - DEFAULT_CARD_WIDTH * 2) + DEFAULT_CARD_WIDTH / 2),
    y: Math.round(Math.random() * (OVERLAY_HEIGHT - DEFAULT_CARD_HEIGHT * 2) + DEFAULT_CARD_HEIGHT / 2),
  };
}

export function cardAddPayload(card: ScryfallCard, position?: { x: number; y: number }) {
  const { x, y } = position ?? randomCardPosition();
  return {
    scryfallId: card.scryfallId,
    name: card.name,
    imageUri: card.imageUri,
    imageUriLarge: card.imageUriLarge,
    artCropUri: card.artCropUri,
    artist: card.artist,
    manaCost: card.manaCost,
    typeLine: card.typeLine,
    oracleText: card.oracleText,
    x,
    y,
    width: DEFAULT_CARD_WIDTH,
    height: DEFAULT_CARD_HEIGHT,
    spotlight: false,
  };
}

export function spotlightPayload(card: ScryfallCard): SpotlightData {
  return {
    name: card.name,
    imageUri: card.imageUri,
    imageUriLarge: card.imageUriLarge,
    manaCost: card.manaCost,
    typeLine: card.typeLine,
    oracleText: card.oracleText,
  };
}

/**
 * Extract commander display name from a deckObj.
 * Partners are joined with " / ", DFCs already contain " // " in the card name.
 */
export function getCommanderLabel(
  deckObj: Record<string, Record<string, { id: string; count: number }>> | null | undefined,
): string | null {
  if (!deckObj) return null;
  const commanders = deckObj["Commanders"];
  if (!commanders || typeof commanders !== "object") return null;
  const names = Object.keys(commanders).filter(
    (k) => typeof commanders[k] === "object" && commanders[k]?.id,
  );
  if (names.length === 0) return null;
  return names.join(" / ");
}

export function cardDragStart(e: React.DragEvent, card: ScryfallCard) {
  e.dataTransfer.setData("application/json", JSON.stringify(card));
  e.dataTransfer.effectAllowed = "copy";
}
