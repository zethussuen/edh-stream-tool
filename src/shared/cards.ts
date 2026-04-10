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

export function cardDragStart(e: React.DragEvent, card: ScryfallCard) {
  e.dataTransfer.setData("application/json", JSON.stringify(card));
  e.dataTransfer.effectAllowed = "copy";
}
