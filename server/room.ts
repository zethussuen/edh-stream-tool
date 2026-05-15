import type { OverlayCard, RoomState, SpotlightData, TopDeckTable, NamePlate, DecklistOverlayData, FocusedCardData, StreamPlayerStats, BrandSettings, OverlayStyleSettings, PodSummaryData } from "../src/shared/types.js";
import { OVERLAY_WIDTH, OVERLAY_HEIGHT } from "../src/shared/constants.js";

interface TopDeckRoomConfig {
  apiKey: string;
  tournamentId: string;
}

interface RoomData {
  state: RoomState;
  nextCardId: number;
  streamTable: TopDeckTable | null;
  namePlates: NamePlate[] | null;
  topDeckConfig: TopDeckRoomConfig | null;
  decklistOverlay: DecklistOverlayData | null;
  focusedCard: FocusedCardData | null;
  feedProducerId: string | null;
  streamRound: { round: number | string; tournamentName: string } | null;
  streamStats: StreamPlayerStats[] | null;
  brandSettings: BrandSettings | null;
  overlayStyleSettings: OverlayStyleSettings | null;
  podSummary: PodSummaryData | null;
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
      flipped: data.flipped ?? false,
      backFace: data.backFace ?? null,
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
    if (rd.state.spotlight?.cardId === id) {
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
    if (rd.state.spotlight?.cardId === card.id) {
      rd.state.spotlight = null;
      return { on: false };
    }
    const data: SpotlightData = {
      cardId: card.id,
      name: card.name,
      imageUri: card.imageUri,
      imageUriLarge: card.imageUriLarge,
      manaCost: card.manaCost,
      typeLine: card.typeLine,
      oracleText: card.oracleText,
      flipped: card.flipped,
      backFace: card.backFace ?? null,
    };
    rd.state.spotlight = data;
    return { on: true, card: data };
  }

  flipCard(room: string, id: string): { card: OverlayCard; spotlight: SpotlightData | null } | null {
    const rd = this.rooms.get(room);
    const card = rd?.state.cards.find((c) => c.id === id);
    if (!card || !card.backFace) return null;
    card.flipped = !card.flipped;
    // Sync spotlight flip if this card is currently spotlighted
    let spotlight: SpotlightData | null = null;
    if (rd?.state.spotlight?.cardId === card.id && rd.state.spotlight.backFace) {
      rd.state.spotlight = { ...rd.state.spotlight, flipped: card.flipped };
      spotlight = rd.state.spotlight;
    }
    return { card, spotlight };
  }

  flipSpotlight(room: string): SpotlightData | null {
    const rd = this.rooms.get(room);
    if (!rd?.state.spotlight?.backFace) return null;
    rd.state.spotlight = { ...rd.state.spotlight, flipped: !rd.state.spotlight.flipped };
    return rd.state.spotlight;
  }

  clearSpotlight(room: string): void {
    const rd = this.rooms.get(room);
    if (rd) rd.state.spotlight = null;
  }

  setStreamTable(room: string, data: TopDeckTable | null): void {
    this.getRoomData(room).streamTable = data;
  }

  getStreamTable(room: string): TopDeckTable | null {
    return this.rooms.get(room)?.streamTable ?? null;
  }

  setNamePlates(room: string, data: NamePlate[] | null): void {
    this.getRoomData(room).namePlates = data;
  }

  getNamePlates(room: string): NamePlate[] | null {
    return this.rooms.get(room)?.namePlates ?? null;
  }

  setTopDeckConfig(room: string, config: TopDeckRoomConfig | null): void {
    this.getRoomData(room).topDeckConfig = config;
  }

  getTopDeckConfig(room: string): TopDeckRoomConfig | null {
    return this.rooms.get(room)?.topDeckConfig ?? null;
  }

  getTopDeckApiKey(room: string): string | null {
    return this.rooms.get(room)?.topDeckConfig?.apiKey ?? null;
  }

  setDecklistOverlay(room: string, data: DecklistOverlayData | null): void {
    this.getRoomData(room).decklistOverlay = data;
  }

  getDecklistOverlay(room: string): DecklistOverlayData | null {
    return this.rooms.get(room)?.decklistOverlay ?? null;
  }

  setFeedProducer(room: string, socketId: string | null): void {
    this.getRoomData(room).feedProducerId = socketId;
  }

  getFeedProducer(room: string): string | null {
    return this.rooms.get(room)?.feedProducerId ?? null;
  }

  clearFeedProducerIfMatch(room: string, socketId: string): boolean {
    const rd = this.rooms.get(room);
    if (rd && rd.feedProducerId === socketId) {
      rd.feedProducerId = null;
      return true;
    }
    return false;
  }

  setFocusedCard(room: string, data: FocusedCardData | null): void {
    this.getRoomData(room).focusedCard = data;
  }

  getFocusedCard(room: string): FocusedCardData | null {
    return this.rooms.get(room)?.focusedCard ?? null;
  }

  flipFocusedCard(room: string): FocusedCardData | null {
    const rd = this.rooms.get(room);
    if (!rd?.focusedCard?.backFace) return null;
    rd.focusedCard = { ...rd.focusedCard, flipped: !rd.focusedCard.flipped };
    return rd.focusedCard;
  }

  setStreamRound(room: string, data: { round: number | string; tournamentName: string } | null): void {
    this.getRoomData(room).streamRound = data;
  }

  getStreamRound(room: string): { round: number | string; tournamentName: string } | null {
    return this.rooms.get(room)?.streamRound ?? null;
  }

  setStreamStats(room: string, data: StreamPlayerStats[] | null): void {
    this.getRoomData(room).streamStats = data;
  }

  getStreamStats(room: string): StreamPlayerStats[] | null {
    return this.rooms.get(room)?.streamStats ?? null;
  }

  setBrandSettings(room: string, data: BrandSettings | null): void {
    this.getRoomData(room).brandSettings = data;
  }

  getBrandSettings(room: string): BrandSettings | null {
    return this.rooms.get(room)?.brandSettings ?? null;
  }

  setOverlayStyleSettings(room: string, data: OverlayStyleSettings | null): void {
    this.getRoomData(room).overlayStyleSettings = data;
  }

  getOverlayStyleSettings(room: string): OverlayStyleSettings | null {
    return this.rooms.get(room)?.overlayStyleSettings ?? null;
  }

  setPodSummary(room: string, data: PodSummaryData | null): void {
    this.getRoomData(room).podSummary = data;
  }

  getPodSummary(room: string): PodSummaryData | null {
    return this.rooms.get(room)?.podSummary ?? null;
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
        streamTable: null,
        namePlates: null,
        topDeckConfig: null,
        decklistOverlay: null,
        focusedCard: null,
        feedProducerId: null,
        streamRound: null,
        streamStats: null,
        brandSettings: null,
        overlayStyleSettings: null,
        podSummary: null,
      };
      this.rooms.set(room, rd);
    }
    return rd;
  }

  private findCard(room: string, id: string): OverlayCard | undefined {
    return this.rooms.get(room)?.state.cards.find((c) => c.id === id);
  }
}
