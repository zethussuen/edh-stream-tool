import type { OverlayCard, RoomState, SpotlightData } from "../src/shared/types.js";
import { OVERLAY_WIDTH, OVERLAY_HEIGHT } from "../src/shared/constants.js";

interface RoomData {
  state: RoomState;
  nextCardId: number;
}

export class RoomManager {
  private rooms = new Map<string, RoomData>();

  getOrCreate(room: string): RoomState {
    return this.getRoomData(room).state;
  }

  addCard(
    room: string,
    data: Omit<OverlayCard, "id" | "zIndex">,
  ): OverlayCard {
    const rd = this.getRoomData(room);
    const maxZ = rd.state.cards.reduce(
      (max, c) => Math.max(max, c.zIndex),
      0,
    );
    const card: OverlayCard = {
      ...data,
      id: `card-${rd.nextCardId++}`,
      zIndex: maxZ + 1,
    };
    rd.state.cards.push(card);
    return card;
  }

  moveCard(room: string, id: string, x: number, y: number): boolean {
    const card = this.findCard(room, id);
    if (!card) return false;
    card.x = x;
    card.y = y;
    return true;
  }

  resizeCard(
    room: string,
    id: string,
    width: number,
    height: number,
  ): boolean {
    const card = this.findCard(room, id);
    if (!card) return false;
    card.width = width;
    card.height = height;
    return true;
  }

  removeCard(room: string, id: string): boolean {
    const rd = this.rooms.get(room);
    if (!rd) return false;
    const idx = rd.state.cards.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    rd.state.cards.splice(idx, 1);
    if (rd.state.spotlight === id) {
      rd.state.spotlight = null;
    }
    return true;
  }

  bringToFront(room: string, id: string): number | null {
    const rd = this.rooms.get(room);
    if (!rd) return null;
    const card = rd.state.cards.find((c) => c.id === id);
    if (!card) return null;
    const maxZ = rd.state.cards.reduce(
      (max, c) => Math.max(max, c.zIndex),
      0,
    );
    card.zIndex = maxZ + 1;
    return card.zIndex;
  }

  setSpotlight(room: string, data: SpotlightData): void {
    const rd = this.getRoomData(room);
    rd.state.spotlight = data;
  }

  toggleSpotlight(
    room: string,
    id: string,
  ): { on: boolean; card?: SpotlightData } {
    const rd = this.getRoomData(room);
    const card = rd.state.cards.find((c) => c.id === id);
    if (!card) return { on: false };
    // If already spotlighting this card, turn off
    if (rd.state.spotlight?.name === card.name) {
      rd.state.spotlight = null;
      return { on: false };
    }
    const data: SpotlightData = {
      name: card.name,
      imageUri: card.imageUri,
      imageUriLarge: card.imageUriLarge,
      manaCost: card.manaCost,
      typeLine: card.typeLine,
      oracleText: card.oracleText,
    };
    rd.state.spotlight = data;
    return { on: true, card: data };
  }

  clearSpotlight(room: string): void {
    const rd = this.rooms.get(room);
    if (rd) rd.state.spotlight = null;
  }

  clearAll(room: string): RoomState {
    const rd = this.getRoomData(room);
    rd.state.cards = [];
    rd.state.spotlight = null;
    return rd.state;
  }

  private getRoomData(room: string): RoomData {
    let rd = this.rooms.get(room);
    if (!rd) {
      rd = {
        state: {
          cards: [],
          spotlight: null,
          settings: { overlayWidth: OVERLAY_WIDTH, overlayHeight: OVERLAY_HEIGHT },
        },
        nextCardId: 1,
      };
      this.rooms.set(room, rd);
    }
    return rd;
  }

  private findCard(room: string, id: string): OverlayCard | undefined {
    return this.rooms.get(room)?.state.cards.find((c) => c.id === id);
  }
}
