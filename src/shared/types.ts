// ── Scryfall ──

export interface ScryfallCard {
  scryfallId: string;
  name: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  artist: string;
  setName: string;
  rarity: string;
  colors: string[];
  imageUri: string;
  imageUriLarge: string;
  imageUriSmall: string;
  artCropUri: string;
  borderCropUri: string;
  doubleFaced: boolean;
  backFace: {
    name: string;
    imageUri: string;
    artCropUri: string;
  } | null;
}

// ── Overlay ──

export interface OverlayCard {
  id: string;
  scryfallId: string;
  name: string;
  imageUri: string;
  imageUriLarge: string;
  artCropUri: string;
  artist: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  spotlight: boolean;
}

// ── Drawing ──

export interface DrawStroke {
  type: "pen" | "arrow" | "circle";
  color: string;
  width: number;
  points?: { x: number; y: number }[];
  cx?: number;
  cy?: number;
  rx?: number;
  ry?: number;
}

export interface DrawStrokeLocal extends DrawStroke {
  fadeStart: number;
}

export type DrawTool = "select" | "pen" | "arrow" | "circle";

// ── Spotlight ──

export interface SpotlightData {
  name: string;
  imageUri: string;
  imageUriLarge: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
}

// ── Room State ──

export interface RoomState {
  cards: OverlayCard[];
  spotlight: SpotlightData | null;
  settings: {
    overlayWidth: number;
    overlayHeight: number;
  };
}

// ── Scrollrack ──

export interface ScrollrackValidation {
  valid: boolean;
  format: string;
  errors?: string[];
  decklist?: Record<string, Record<string, { quantity: number; id: string }>>;
  cardsPerSection?: Record<string, number>;
  totalCards?: number;
}

// ── TopDeck.gg ──

export interface TopDeckConfig {
  apiKey: string;
  tournamentId: string;
}

export interface TopDeckTournament {
  data: {
    name: string;
    game: string;
    format: string;
    startDate: number;
  };
  standings: TopDeckStanding[];
  rounds: TopDeckRound[];
}

export interface TopDeckStanding {
  standing: number;
  name: string;
  id: string | null;
  decklist: string | null;
  deckObj: Record<
    string,
    Record<string, { id: string; count: number }>
  > | null;
  points: number;
  winRate: number;
  wins?: number;
  losses?: number;
  draws?: number;
}

export interface TopDeckRound {
  round: number | string;
  tables: TopDeckTable[];
}

export interface TopDeckTable {
  table: number | "Byes";
  players: TopDeckPlayer[];
  winner: string | null;
  winner_id: string | null;
  status: "Completed" | "Active" | "Pending" | "Bye";
}

export interface TopDeckPlayer {
  name: string;
  id: string | null;
  decklist: string | null;
  deckObj: Record<
    string,
    Record<string, { id: string; count: number }>
  > | null;
}
