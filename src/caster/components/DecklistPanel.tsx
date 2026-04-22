import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { ScryfallCard, TopDeckConfig, TopDeckAttendee, TopDeckTable } from "@shared/types";
import * as topdeck from "@shared/topdeck";
import * as scryfall from "@shared/scryfall";
import * as scrollrack from "@shared/scrollrack";
import { cardAddPayload, spotlightPayload, cardDragStart, getCommanderLabel } from "@shared/cards";
import { matchesFilter, parseQuery } from "@shared/card-filter";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignCircleIcon, SpotlightIcon } from "@hugeicons/core-free-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";
import { ManaCost } from "@shared/components/ManaCost";

interface Props {
  emit: (event: string, data?: unknown) => void;
  topDeckConfig: TopDeckConfig | null;
  hasServerKey: boolean;
  streamTable: TopDeckTable | null;
  pendingPlayerId: string | null;
  onPlayerConsumed: () => void;
}

interface DeckSection {
  name: string;
  cards: ScryfallCard[];
}

type DeckError =
  | { type: "error"; message: string }
  | { type: "url"; url: string }
  | null;

type GroupMode = "section" | "type";
type SortField = "name" | "mv";
type SortDir = "asc" | "desc";

const TYPE_GROUP_ORDER = [
  "Commander",
  "Planeswalker",
  "Creature",
  "Sorcery",
  "Instant",
  "Artifact",
  "Enchantment",
  "Land",
  "Other",
] as const;

function getTypeGroup(card: ScryfallCard): string {
  const tl = card.typeLine.toLowerCase();
  // Check supertypes/types in priority order
  if (tl.includes("land")) return "Land";
  if (tl.includes("planeswalker")) return "Planeswalker";
  if (tl.includes("creature")) return "Creature";
  if (tl.includes("instant")) return "Instant";
  if (tl.includes("sorcery")) return "Sorcery";
  if (tl.includes("artifact")) return "Artifact";
  if (tl.includes("enchantment")) return "Enchantment";
  return "Other";
}

function groupByType(
  sections: DeckSection[],
  commanderSectionCards: Set<string>,
): DeckSection[] {
  const groups = new Map<string, ScryfallCard[]>();
  for (const g of TYPE_GROUP_ORDER) groups.set(g, []);

  for (const section of sections) {
    for (const card of section.cards) {
      // Cards from the Commanders section stay as "Commander"
      if (commanderSectionCards.has(card.scryfallId)) {
        groups.get("Commander")!.push(card);
      } else {
        const group = getTypeGroup(card);
        groups.get(group)!.push(card);
      }
    }
  }

  return Array.from(groups.entries())
    .filter(([, cards]) => cards.length > 0)
    .map(([name, cards]) => ({ name, cards }));
}

function sortCards(cards: ScryfallCard[], field: SortField, dir: SortDir): ScryfallCard[] {
  const sorted = [...cards];
  sorted.sort((a, b) => {
    let cmp: number;
    if (field === "mv") {
      cmp = a.cmc - b.cmc || a.name.localeCompare(b.name);
    } else {
      cmp = a.name.localeCompare(b.name);
    }
    return dir === "desc" ? -cmp : cmp;
  });
  return sorted;
}

/** Extract oracle IDs from a deckObj/validation map and batch-fetch via Scryfall. */
async function buildSectionsFromIds(
  idMap: Record<string, Record<string, { id: string; [k: string]: unknown }>>,
  skipMetadata: boolean,
): Promise<{ sections: DeckSection[]; found: number; total: number }> {
  const entries: { section: string; oracleId: string }[] = [];
  const allIds: string[] = [];

  for (const [sectionName, cards] of Object.entries(idMap)) {
    if (skipMetadata && (sectionName === "metadata" || typeof cards !== "object")) continue;
    for (const [, data] of Object.entries(cards)) {
      if (typeof data !== "object" || !data?.id) continue;
      entries.push({ section: sectionName, oracleId: data.id });
      allIds.push(data.id);
    }
  }

  const cardMap = await scryfall.getCollection(allIds);

  const sectionMap = new Map<string, DeckSection>();
  for (const entry of entries) {
    if (!sectionMap.has(entry.section)) {
      sectionMap.set(entry.section, { name: entry.section, cards: [] });
    }
    const card = cardMap.get(entry.oracleId);
    if (card) {
      sectionMap.get(entry.section)!.cards.push(card);
    }
  }

  return { sections: Array.from(sectionMap.values()), found: cardMap.size, total: allIds.length };
}

function PlayerRow({ attendee, onSelect }: { attendee: TopDeckAttendee; onSelect: (a: TopDeckAttendee) => void }) {
  const hasDeck = !!(attendee.deckObj || attendee.decklist);
  const cmdr = getCommanderLabel(attendee.deckObj);
  return (
    <button
      onClick={() => hasDeck && onSelect(attendee)}
      disabled={!hasDeck}
      className={`flex items-center gap-2 rounded p-2 text-left transition-colors w-full ${
        hasDeck
          ? "hover:bg-bg-surface cursor-pointer"
          : "opacity-40 cursor-not-allowed"
      }`}
    >
      {attendee.standing != null && (
        <span className="text-xs text-text-muted w-6 text-right shrink-0">
          #{attendee.standing}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{attendee.name}</p>
        {cmdr && (
          <p className="text-[11px] text-text-dim truncate">{cmdr}</p>
        )}
      </div>
      {hasDeck ? (
        <span className="text-[10px] text-gold shrink-0">Deck &rarr;</span>
      ) : (
        <span className="text-[10px] text-text-muted shrink-0">No deck</span>
      )}
    </button>
  );
}

export function DecklistPanel({ emit, topDeckConfig, hasServerKey, streamTable, pendingPlayerId, onPlayerConsumed }: Props) {
  const [attendees, setAttendees] = useState<TopDeckAttendee[]>([]);
  const [tournamentName, setTournamentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Selected player's deck
  const [selectedPlayer, setSelectedPlayer] = useState<TopDeckAttendee | null>(null);
  const [sections, setSections] = useState<DeckSection[]>([]);
  const [deckLoading, setDeckLoading] = useState(false);
  const [deckError, setDeckError] = useState<DeckError>(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [filter, setFilter] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("section");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [lastFetched, setLastFetched] = useState<number | null>(null);

  const hasApiKey = !!(topDeckConfig?.apiKey || hasServerKey);

  const fetchAttendees = useCallback(async (forceRefresh = false) => {
    if (!hasApiKey || !topDeckConfig?.tournamentId) return;
    setLoading(true);
    setError("");
    try {
      const [tournamentResult, attendeeResult] = await Promise.all([
        topdeck.getTournament(topDeckConfig, forceRefresh),
        topdeck.getAttendees(topDeckConfig, forceRefresh),
      ]);
      setTournamentName(tournamentResult.data.data?.name ?? "Tournament");
      const sorted = attendeeResult.data
        .filter((a) => a.status === "player")
        .sort((a, b) => {
          if (a.standing != null && b.standing != null) return a.standing - b.standing;
          if (a.standing != null) return -1;
          if (b.standing != null) return 1;
          return a.name.localeCompare(b.name);
        });
      setAttendees(sorted);
      setLastFetched(attendeeResult.fetchedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch tournament");
    } finally {
      setLoading(false);
    }
  }, [topDeckConfig, hasApiKey]);

  useEffect(() => {
    fetchAttendees(false);
  }, [fetchAttendees]);

  useEffect(() => {
    setSelectedPlayer(null);
    setSections([]);
  }, [topDeckConfig?.tournamentId]);

  const loadPlayerDeck = useCallback(async (attendee: TopDeckAttendee) => {
    if (!attendee.deckObj && !attendee.decklist) return;
    setSelectedPlayer(attendee);
    setDeckLoading(true);
    setDeckError(null);
    setSections([]);

    try {
      if (attendee.deckObj) {
        setProgress({ loaded: 0, total: 0 });
        const result = await buildSectionsFromIds(attendee.deckObj as Record<string, Record<string, { id: string }>>, true);
        setSections(result.sections);
        setProgress({ loaded: result.found, total: result.total });
      } else if (attendee.decklist) {
        if (attendee.decklist.startsWith("http://") || attendee.decklist.startsWith("https://")) {
          setDeckError({ type: "url", url: attendee.decklist });
          return;
        }

        const validation = await scrollrack.validateDeck(attendee.decklist);

        if (validation.decklist) {
          setProgress({ loaded: 0, total: 0 });
          const result = await buildSectionsFromIds(validation.decklist, false);
          setSections(result.sections);
          setProgress({ loaded: result.found, total: result.total });
        } else {
          const parsed = scrollrack.parseRawDecklist(attendee.decklist);
          if (parsed.length === 0) {
            setDeckError({ type: "error", message: "Could not parse decklist text" });
            return;
          }

          setProgress({ loaded: 0, total: parsed.length });
          const cards: ScryfallCard[] = [];
          await scrollrack.resolveCardNames(parsed, (card, idx) => {
            cards.push(card);
            setSections([{ name: "Deck", cards: [...cards] }]);
            setProgress({ loaded: idx + 1, total: parsed.length });
          });
        }
      }
    } catch (e) {
      setDeckError({ type: "error", message: e instanceof Error ? e.message : "Failed to load deck" });
    } finally {
      setDeckLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!pendingPlayerId || attendees.length === 0) return;
    const match = attendees.find((a) => a.uid === pendingPlayerId);
    if (match && (match.deckObj || match.decklist)) {
      loadPlayerDeck(match);
    }
    onPlayerConsumed();
  }, [pendingPlayerId, attendees, loadPlayerDeck, onPlayerConsumed]);

  const addCard = useCallback(
    (card: ScryfallCard) => emit("card:add", cardAddPayload(card)),
    [emit],
  );

  const spotlight = useCallback(
    (card: ScryfallCard) => emit("spotlight:show", spotlightPayload(card)),
    [emit],
  );

  const goBack = useCallback(() => {
    setSelectedPlayer(null);
    setSections([]);
    setDeckError(null);
    setProgress({ loaded: 0, total: 0 });
    setFilter("");
  }, []);

  // Parse filter query once, evaluate per card
  const filterAst = useMemo(() => filter.trim() ? parseQuery(filter) : null, [filter]);

  // Build commander card set for type grouping (cards from "Commanders" section)
  const commanderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of sections) {
      if (s.name.toLowerCase() === "commanders") {
        for (const c of s.cards) ids.add(c.scryfallId);
      }
    }
    return ids;
  }, [sections]);

  // Group, sort, and filter cards
  const displaySections = useMemo(() => {
    const grouped = groupMode === "type" ? groupByType(sections, commanderIds) : sections;
    return grouped
      .map((section) => {
        const filtered = filterAst
          ? section.cards.filter((c) => matchesFilter(c, filterAst))
          : section.cards;
        return { name: section.name, cards: sortCards(filtered, sortField, sortDir) };
      })
      .filter((s) => s.cards.length > 0);
  }, [sections, groupMode, sortField, sortDir, filterAst, commanderIds]);

  if (!hasApiKey || !topDeckConfig?.tournamentId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm text-text-dim">No tournament configured</p>
        <p className="text-xs text-text-muted">
          {!hasApiKey
            ? "Set your TopDeck.gg API key and Tournament ID in Settings to browse player decklists"
            : "Set a Tournament ID in Settings to browse player decklists"}
        </p>
      </div>
    );
  }

  // Player deck view
  if (selectedPlayer) {
    return (
      <div className="flex flex-col gap-2 p-3">
        <button
          onClick={goBack}
          className="flex items-center gap-1 text-xs text-gold hover:text-gold-hover transition-colors self-start"
        >
          &larr; Back to players
        </button>

        <div className="mb-1">
          <p className="text-sm font-medium text-text-primary">{selectedPlayer.name}</p>
          {getCommanderLabel(selectedPlayer.deckObj) && (
            <p className="text-xs text-gold truncate">{getCommanderLabel(selectedPlayer.deckObj)}</p>
          )}
          {selectedPlayer.standing != null && (
            <p className="text-[11px] text-text-dim">
              Standing #{selectedPlayer.standing}
            </p>
          )}
        </div>

        {!deckLoading && sections.length > 0 && (
          <>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter — t:type, o:text, c:color, mv<=N"
              className="h-7 w-full rounded border border-border bg-bg-surface px-2 text-xs text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
            />
            <SortControls
              groupMode={groupMode} setGroupMode={setGroupMode}
              sortField={sortField} setSortField={setSortField}
              sortDir={sortDir} setSortDir={setSortDir}
            />
          </>
        )}

        {deckLoading && progress.total > 0 && (
          <p className="text-xs text-text-dim">
            Loading cards: {progress.loaded}/{progress.total}
          </p>
        )}

        {deckError?.type === "url" && (
          <p className="text-xs text-text-dim">
            Decklist is an external link:{" "}
            <a
              href={deckError.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:text-gold-hover underline"
            >
              Open decklist
            </a>
          </p>
        )}
        {deckError?.type === "error" && (
          <p className="text-xs text-status-red">{deckError.message}</p>
        )}

        {displaySections.map((section) => (
          <div key={section.name}>
            <div className="sticky top-0 z-10 bg-bg-raised py-1">
              <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
                {section.name} ({section.cards.length})
              </p>
            </div>
            <div className="flex flex-col gap-1">
              {section.cards.map((card) => (
                <div
                  key={card.scryfallId}
                  draggable
                  onDragStart={(e) => cardDragStart(e, card)}
                  className="flex items-center gap-2 rounded p-1.5 hover:bg-bg-surface cursor-grab active:cursor-grabbing"
                  title="Drag onto canvas to place"
                >
                  <img
                    src={card.imageUriSmall}
                    alt={card.name}
                    className="rounded"
                    style={{ width: 48, height: 67 }}
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`https://scryfall.com/card/${card.scryfallId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        onDragStart={(e) => e.stopPropagation()}
                        className="text-sm text-text-primary truncate hover:text-gold hover:underline transition-colors"
                      >{card.name}</a>
                      <ManaCost cost={card.manaCost} size={14} />
                    </div>
                    <p className="text-xs text-text-dim truncate">{card.typeLine}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => addCard(card)}
                          className="h-6 w-6 flex items-center justify-center rounded bg-bg-surface text-text-dim hover:bg-gold hover:text-bg-base transition-colors"
                        >
                          <HugeiconsIcon icon={PlusSignCircleIcon} size={14} color="currentColor" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" sideOffset={6}>Add to overlay</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => spotlight(card)}
                          className="h-6 w-6 flex items-center justify-center rounded bg-bg-surface text-text-dim hover:bg-gold hover:text-bg-base transition-colors"
                        >
                          <HugeiconsIcon icon={SpotlightIcon} size={14} color="currentColor" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" sideOffset={6}>Spotlight</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!deckLoading && sections.length === 0 && !deckError && (
          <p className="text-xs text-text-muted text-center py-4">No cards loaded</p>
        )}
      </div>
    );
  }

  // Player list view
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gold truncate">
          {tournamentName || "Tournament"}
        </h3>
        <button
          onClick={() => fetchAttendees(true)}
          disabled={loading}
          className="h-6 rounded bg-bg-surface px-2 text-[10px] text-text-dim hover:bg-bg-overlay transition-colors"
        >
          {loading ? "..." : "Pull Latest"}
        </button>
      </div>

      {lastFetched && (
        <p className="text-[10px] text-text-muted">
          Data from {topdeck.formatCacheAge(lastFetched)}
        </p>
      )}

      {error && <p className="text-xs text-status-red">{error}</p>}

      {loading && attendees.length === 0 && (
        <p className="text-xs text-text-dim text-center py-4">Loading...</p>
      )}

      {streamTable && <StreamTableSection table={streamTable} attendees={attendees} onSelect={loadPlayerDeck} />}

      <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
        {streamTable ? "All Players" : "Players"} ({attendees.length})
      </p>

      <div className="flex flex-col gap-1">
        {attendees.map((a) => (
          <PlayerRow key={a.uid} attendee={a} onSelect={loadPlayerDeck} />
        ))}
      </div>
    </div>
  );
}

function StreamTableSection({
  table,
  attendees,
  onSelect,
}: {
  table: TopDeckTable;
  attendees: TopDeckAttendee[];
  onSelect: (a: TopDeckAttendee) => void;
}) {
  const streamPlayerIds = new Set(
    table.players.map((p) => p.id).filter(Boolean),
  );
  const streamAttendees = attendees.filter((a) => streamPlayerIds.has(a.uid));
  const streamPlayerNames = new Set(
    table.players.map((p) => p.name.toLowerCase()),
  );
  const matched =
    streamAttendees.length > 0
      ? streamAttendees
      : attendees.filter((a) => streamPlayerNames.has(a.name.toLowerCase()));

  return (
    <div className="mb-3 rounded border border-gold/30 bg-gold/5 p-2">
      <p className="text-[10px] font-medium uppercase tracking-widest text-gold mb-1.5">
        Stream Pod — Table {table.table}
      </p>
      <div className="flex flex-col gap-1">
        {matched.length > 0
          ? matched.map((a) => (
              <PlayerRow key={a.uid} attendee={a} onSelect={onSelect} />
            ))
          : table.players.map((p) => (
              <p key={p.name} className="text-sm text-text-primary px-1.5 py-1">
                {p.name}
              </p>
            ))}
      </div>
    </div>
  );
}

const PILL = "px-1.5 py-0.5 rounded text-[10px] transition-colors";
const PILL_ON = `${PILL} bg-gold/20 text-gold`;
const PILL_OFF = `${PILL} text-text-muted hover:text-text-dim hover:bg-bg-surface`;

function SortControls({
  groupMode, setGroupMode,
  sortField, setSortField,
  sortDir, setSortDir,
}: {
  groupMode: GroupMode; setGroupMode: Dispatch<SetStateAction<GroupMode>>;
  sortField: SortField; setSortField: Dispatch<SetStateAction<SortField>>;
  sortDir: SortDir; setSortDir: Dispatch<SetStateAction<SortDir>>;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] text-text-muted">Group:</span>
      <button className={groupMode === "section" ? PILL_ON : PILL_OFF} onClick={() => setGroupMode("section")}>
        Section
      </button>
      <button className={groupMode === "type" ? PILL_ON : PILL_OFF} onClick={() => setGroupMode("type")}>
        Type
      </button>

      <span className="text-[10px] text-text-muted ml-1">Sort:</span>
      <button className={sortField === "name" ? PILL_ON : PILL_OFF} onClick={() => setSortField("name")}>
        Name
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className={sortField === "mv" ? PILL_ON : PILL_OFF} onClick={() => setSortField("mv")}>
            MV
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>Mana Value</TooltipContent>
      </Tooltip>

      <button
        className={`${PILL} text-text-muted hover:text-text-dim`}
        onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}
        title={sortDir === "asc" ? "Ascending" : "Descending"}
      >
        {sortDir === "asc" ? "\u2191" : "\u2193"}
      </button>
    </div>
  );
}
