import { useCallback, useEffect, useMemo, useState } from "react";
import type { TopDeckConfig, TopDeckStanding, TopDeckRound, TopDeckTable, TopDeckAttendee, NamePlate, StreamPlayerStats } from "@shared/types";
import * as topdeck from "@shared/topdeck";
import * as scryfall from "@shared/scryfall";
import { getCommanderLabel } from "@shared/cards";

interface Props {
  config: TopDeckConfig | null;
  hasServerKey?: boolean;
  streamTable: TopDeckTable | null;
  onSetStreamTable: (table: TopDeckTable | null, plates: NamePlate[] | null, round?: number | string, tournamentName?: string, stats?: StreamPlayerStats[] | null) => void;
  onSelectPlayer: (playerId: string) => void;
}

export function TournamentPanel({ config, hasServerKey, streamTable, onSetStreamTable, onSelectPlayer }: Props) {
  const [standings, setStandings] = useState<TopDeckStanding[]>([]);
  const [attendees, setAttendees] = useState<TopDeckAttendee[]>([]);
  const [currentRound, setCurrentRound] = useState<TopDeckRound | null>(null);
  const [tournamentName, setTournamentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  // Single pass over attendees to build commander label + oracle ID lookups
  const commanderData = useMemo(() => {
    const labelById = new Map<string, string>();
    const labelByName = new Map<string, string>();
    const idsById = new Map<string, string[]>();
    const idsByName = new Map<string, string[]>();

    for (const a of attendees) {
      const label = getCommanderLabel(a.deckObj);
      const key = a.name.toLowerCase();

      if (label) {
        labelById.set(a.uid, label);
        labelByName.set(key, label);
      }

      if (a.deckObj?.Commanders) {
        const ids = Object.values(a.deckObj.Commanders)
          .filter((v): v is { id: string; count: number } => typeof v === "object" && !!v?.id)
          .map((v) => v.id);
        if (ids.length > 0) {
          idsById.set(a.uid, ids);
          idsByName.set(key, ids);
        }
      }
    }

    return { labelById, labelByName, idsById, idsByName };
  }, [attendees]);

  function lookupCommanderIds(playerId: string | null, playerName: string): string[] {
    if (playerId && commanderData.idsById.has(playerId)) return commanderData.idsById.get(playerId)!;
    return commanderData.idsByName.get(playerName.toLowerCase()) ?? [];
  }

  async function buildNamePlates(table: TopDeckTable): Promise<NamePlate[]> {
    const players = table.players ?? [];

    // Collect all commander oracle IDs for this table's players
    const allOracleIds: string[] = [];
    for (const p of players) {
      allOracleIds.push(...lookupCommanderIds(p.id, p.name));
    }

    // Batch fetch color identities from Scryfall
    let cardMap = new Map<string, { colorIdentity: string[] }>();
    if (allOracleIds.length > 0) {
      try {
        const fetched = await scryfall.getCollection(allOracleIds);
        cardMap = fetched as Map<string, { colorIdentity: string[] }>;
      } catch {
        // Fall back to no color identity
      }
    }

    return players.map((p) => {
      const oracleIds = lookupCommanderIds(p.id, p.name);
      // Merge color identities from all commanders (partners)
      const colorSet = new Set<string>();
      for (const oid of oracleIds) {
        const card = cardMap.get(oid);
        if (card) {
          for (const c of card.colorIdentity) colorSet.add(c);
        }
      }
      // Sort in WUBRG order
      const wubrg = ["W", "U", "B", "R", "G"];
      const colorIdentity = wubrg.filter((c) => colorSet.has(c));
      if (colorIdentity.length === 0 && oracleIds.length > 0) {
        colorIdentity.push("C"); // colorless
      }

      return {
        name: p.name,
        deckName: lookupCommander(p.id, p.name),
        colorIdentity,
      };
    });
  }

  function lookupCommander(id: string | null, name: string): string | null {
    if (id && commanderData.labelById.has(id)) return commanderData.labelById.get(id)!;
    return commanderData.labelByName.get(name.toLowerCase()) ?? null;
  }

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!(config?.apiKey || hasServerKey) || !config?.tournamentId) return;
    setLoading(true);
    setError("");
    try {
      const [tournamentResult, roundResult, attendeeResult] = await Promise.all([
        topdeck.getTournament(config, forceRefresh),
        topdeck.getLatestRound(config, forceRefresh).catch(() => null),
        topdeck.getAttendees(config, forceRefresh).catch(() => null),
      ]);
      setTournamentName(tournamentResult.data.data?.name ?? "Tournament");
      setStandings(tournamentResult.data.standings ?? []);
      setCurrentRound(roundResult?.data ?? null);
      if (attendeeResult) setAttendees(attendeeResult.data);
      setLastFetched(tournamentResult.fetchedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch tournament");
    } finally {
      setLoading(false);
    }
  }, [config, hasServerKey]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  if (!(config?.apiKey || hasServerKey) || !config?.tournamentId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm text-text-dim">No tournament configured</p>
        <p className="text-xs text-text-muted">
          Set your TopDeck.gg API key and Tournament ID in Settings
        </p>
      </div>
    );
  }

  const isStreamTable = (table: TopDeckTable) =>
    streamTable != null && table.table === streamTable.table;

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gold truncate">
          {tournamentName || "Tournament"}
        </h3>
        <button
          onClick={() => fetchData(true)}
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

      {loading && standings.length === 0 && (
        <p className="text-xs text-text-dim text-center py-4">Loading...</p>
      )}

      {/* Current round */}
      {currentRound?.tables && (
        <div className="mb-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-1">
            Round {currentRound.round}
          </p>
          {currentRound.tables.map((table) => {
            const isStream = isStreamTable(table);
            return (
              <div
                key={typeof table.table === "number" ? table.table : "byes"}
                className={`rounded p-2 mb-1 transition-colors ${
                  isStream
                    ? "bg-gold/10 border border-gold/30"
                    : "bg-bg-surface"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] text-text-muted">
                    Table {table.table}
                    {table.status !== "Pending" && (
                      <span className="ml-1 text-text-dim">({table.status})</span>
                    )}
                    {isStream && (
                      <span className="ml-1.5 text-gold font-medium">Stream Pod</span>
                    )}
                  </p>
                  {table.table !== "Byes" && (
                    <button
                      onClick={async () => {
                        if (isStream) {
                          onSetStreamTable(null, null);
                        } else {
                          try {
                            const plates = await buildNamePlates(table);
                            const stats: StreamPlayerStats[] = table.players.map((p) => {
                              const s = standings.find((st) => st.id === p.id || st.name === p.name);
                              return {
                                standing: s?.standing ?? null,
                                wins: s?.wins ?? 0,
                                losses: s?.losses ?? 0,
                                draws: s?.draws ?? 0,
                              };
                            });
                            onSetStreamTable(table, plates, currentRound?.round, tournamentName, stats);
                          } catch (e) {
                            setError(e instanceof Error ? e.message : "Failed to set stream pod");
                          }
                        }
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                        isStream
                          ? "bg-gold/20 text-gold hover:bg-gold/30"
                          : "text-text-muted hover:text-gold hover:bg-bg-overlay"
                      }`}
                    >
                      {isStream ? "Unset Stream Pod" : "Set as Stream Pod"}
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-0.5">
                  {(table.players ?? []).map((p) => {
                    const cmdr = lookupCommander(p.id, p.name);
                    return (
                      <button
                        key={p.name}
                        onClick={() => p.id && onSelectPlayer(p.id)}
                        className={`rounded px-2 py-1 text-left transition-colors ${
                          isStream
                            ? "bg-gold/15 hover:bg-gold/25"
                            : "bg-bg-overlay hover:bg-bg-surface"
                        } ${p.id ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <span className={`text-xs ${isStream ? "text-gold" : "text-text-primary"}`}>
                          {p.name}
                        </span>
                        {cmdr && (
                          <p className="text-[10px] text-text-dim truncate">{cmdr}</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standings */}
      <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
        Standings ({standings.length})
      </p>
      <div className="flex flex-col gap-1">
        {standings.map((s) => {
          const cmdr = lookupCommander(s.id, s.name);
          return (
            <div
              key={s.name}
              className="flex items-center gap-2 rounded p-2"
            >
              <span className="text-xs text-text-muted w-6 text-right shrink-0">
                #{s.standing}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{s.name}</p>
                {cmdr && <p className="text-[11px] text-text-dim truncate">{cmdr}</p>}
                <p className="text-xs text-text-muted">
                  <span title="Points">{s.points}pts</span>{" · "}
                  <span title="Win Rate">{Math.round(s.winRate * 100)}% WR</span>{" · "}
                  <span title="Opponent Win Rate">{Math.round(s.opponentWinRate * 100)}% OWR</span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
