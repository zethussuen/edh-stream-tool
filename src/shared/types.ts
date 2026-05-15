// ── Scryfall ──

export interface CardBackFace {
  name: string;
  imageUri: string;
  imageUriLarge: string;
  artCropUri: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
}

export interface ScryfallCard {
  scryfallId: string;
  name: string;
  manaCost: string;
  cmc: number;
  typeLine: string;
  oracleText: string;
  artist: string;
  setName: string;
  rarity: string;
  colors: string[];
  colorIdentity: string[];
  power: string | null;
  toughness: string | null;
  keywords: string[];
  imageUri: string;
  imageUriLarge: string;
  imageUriSmall: string;
  artCropUri: string;
  borderCropUri: string;
  doubleFaced: boolean;
  backFace: CardBackFace | null;
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
  flipped: boolean;
  backFace: CardBackFace | null;
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
  // Source card on the canvas, if any. null when spotlighted directly from
  // search/decklist without a corresponding OverlayCard.
  cardId: string | null;
  name: string;
  imageUri: string;
  imageUriLarge: string;
  manaCost: string;
  typeLine: string;
  oracleText: string;
  flipped: boolean;
  backFace: CardBackFace | null;
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
  room?: string;
}

export interface TopDeckEventData {
  lat?: number;
  lng?: number;
  city?: string;
  state?: string;
  location?: string;
  headerImage?: string;
}

export interface TopDeckTournament {
  data: {
    name: string;
    game: string;
    format: string;
    startDate: number;
    endDate?: number;
    status?: string;
    swissNum?: number;
    topCut?: number;
    eventData?: TopDeckEventData;
  };
  standings: TopDeckStanding[];
  rounds: TopDeckRound[];
}

export interface TopDeckStanding {
  standing: number;
  name: string;
  discord?: string;
  discordId?: string;
  id: string | null;
  decklist: string | null;
  deckObj: Record<
    string,
    Record<string, { id: string; count: number }>
  > | null;
  points: number;
  winRate: number;
  opponentWinRate: number;
  gameWinRate?: number;
  opponentGameWinRate?: number;
  wins?: number;
  winsSwiss?: number;
  winsBracket?: number;
  winRateSwiss?: number;
  winRateBracket?: number;
  losses?: number;
  lossesSwiss?: number;
  lossesBracket?: number;
  draws?: number;
  byes?: number;
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
  discord?: string;
  discordId?: string;
  id: string | null;
  decklist: string | null;
  deckObj: Record<
    string,
    Record<string, { id: string; count: number }>
  > | null;
}

// Response shape of GET /v2/tournaments/{TID}/players/{ID}.
// Distinct from TopDeckPlayer (which is the pairing entry inside rounds/tables)
// because the detail endpoint returns game-level records and a standing.
export interface TopDeckPlayerDetail {
  name: string;
  standing: number;
  decklist: string | null;
  deckObj: Record<
    string,
    Record<string, { id: string; count: number }>
  > | null;
  winRate: number;
  gamesPlayed: number;
  gamesWon: number;
  gamesDrawn: number;
  gamesLost: number;
  byes: number;
}

// ── Focused Card ──

export interface FocusedCardData {
  name: string;
  imageUriLarge: string;
  flipped: boolean;
  backFace: CardBackFace | null;
}

// ── Decklist Overlay ──

export interface DecklistOverlayCard {
  name: string;
  manaCost: string;
  cmc: number;
  quantity: number;
}

export interface DecklistOverlaySection {
  name: string;
  cards: DecklistOverlayCard[];
}

export interface DecklistOverlayData {
  playerName: string;
  commanderName: string | null;
  sections: DecklistOverlaySection[];
}

// ── Stream Player Stats ──

export interface StreamPlayerStats {
  standing: number | null;
  wins: number;
  losses: number;
  draws: number;
}

// ── Name Plates ──

export interface NamePlate {
  name: string;
  deckName: string | null;
  colorIdentity: string[];
}

// ── Pod Summary ──

export interface PodSummaryPlayer {
  name: string;
  commanderName: string | null;
  // Front-face card image URLs for the player's commanders, capped at 2.
  // First entry is the primary commander, second is the partner if any.
  commanderImages: string[];
  colorIdentity: string[];
  standing: number | null;
  points: number | null;
  wins: number;
  losses: number;
  draws: number;
  opponentWinRate: number | null;
}

export interface PodSummaryData {
  tournamentName: string;
  round: number | string | null;
  players: PodSummaryPlayer[];
}

// ── Brand Settings ──

export interface BrandSettings {
  accentColor: string;  // any valid CSS color: "#c8aa6e", "hsl(...)", "rgba(...)"
  fontFamily: string;   // Google Font family name, e.g. "Bebas Neue", "Oswald"
}

// ── Overlay Style Settings ──

export type NameplateStyle = "classic" | "fighter" | "glass" | "broadcast";

export interface OverlayStyleSettings {
  nameplateStyle: NameplateStyle;
}

export interface TopDeckAttendee {
  uid: string;
  name: string;
  email?: string;
  discord?: string;
  discordId?: string;
  status: string;
  standing?: number;
  decklist: string | null;
  deckObj: Record<
    string,
    Record<string, { id: string; count: number }>
  > | null;
}

// ── TopDeck Profile Stats ──
// Shape of https://topdeck.gg/profile/{uid}/stats when requested with
// Accept: application/json. The endpoint is public — no API key needed.

export interface TopDeckProfileTournamentEntry {
  id: string;
  name: string;
  date: string;            // ISO 8601
  record: string;          // e.g. "4-0-1"
  placement: string;       // e.g. "1st", "Top 16"
  placementNumber: number;
  size: number;
  game: string;
  bracketLink: string;
  topCut?: number;
  rawFormat?: string;
}

export interface TopDeckTopFinishCounts {
  firstPlaceFinishes: number;
  top2: number;
  top4: number;
  top8: number;
  top10: number;
  top16: number;
}

export interface TopDeckYearlyStatsEntry extends TopDeckTopFinishCounts {
  totalTournaments: number;
  topCutEligible: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface TopDeckEloEntry {
  game: string;
  format: string;
  leaderboardId: string;
  elo: number;
  gamesPlayed: number;
}

export interface TopDeckProfileStats {
  gameFormats: Record<string, TopDeckProfileTournamentEntry[]>;
  topFinishes: Record<string, TopDeckTopFinishCounts>;
  yearlyStats: Record<string, Record<string, TopDeckYearlyStatsEntry>>;
  tdcsData: unknown;
  leaguesData: TopDeckProfileTournamentEntry[];
  elos: TopDeckEloEntry[];
  headToHead: unknown;
}

// ── Player Spotlight Overlay ──

export interface PlayerSpotlightData {
  uid: string;
  name: string;
  commanderName: string | null;
  commanderImages: string[];   // up to 2 (primary + partner)
  colorIdentity: string[];
  // Current tournament context
  tournamentName: string;
  standing: number | null;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null;       // 0–1
  points: number | null;
  opponentWinRate: number | null;
  // Historic
  format: string;               // which key in profile stats to highlight, e.g. "Magic: The Gathering: EDH"
  profile: TopDeckProfileStats | null;
}
