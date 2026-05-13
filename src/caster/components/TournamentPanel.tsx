import { useCallback, useEffect, useMemo, useState } from "react";
import type { TopDeckConfig, TopDeckStanding, TopDeckRound, TopDeckTable, TopDeckAttendee, NamePlate, StreamPlayerStats, PodSummaryData, PodSummaryPlayer, ScryfallCard } from "@shared/types";
import * as topdeck from "@shared/topdeck";
import * as scryfall from "@shared/scryfall";
import { getCommanderLabel } from "@shared/cards";

interface Props {
  config: TopDeckConfig | null;
  hasServerKey?: boolean;
  streamTable: TopDeckTable | null;
  onSetStreamTable: (table: TopDeckTable | null, plates: NamePlate[] | null, round?: number | string, tournamentName?: string, stats?: StreamPlayerStats[] | null) => void;
  onSelectPlayer: (playerId: string) => void;
  podSummaryActive: boolean;
  onSetPodSummary: (data: PodSummaryData | null) => void;
}

export function TournamentPanel({ config, hasServerKey, streamTable, onSetStreamTable, onSelectPlayer, podSummaryActive, onSetPodSummary }: Props) {
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

  async function getCommanderCardsForTable(table: TopDeckTable): Promise<Map<string, ScryfallCard>> {
    const players = table.players ?? [];
    const allOracleIds: string[] = [];
    for (const p of players) {
      allOracleIds.push(...lookupCommanderIds(p.id, p.name));
    }
    if (allOracleIds.length === 0) return new Map();
    try {
      return await scryfall.getCollection(allOracleIds);
    } catch {
      return new Map();
    }
  }

  function mergedColorIdentity(playerId: string | null, playerName: string, cardMap: Map<string, ScryfallCard>): string[] {
    const oracleIds = lookupCommanderIds(playerId, playerName);
    const colorSet = new Set<string>();
    for (const oid of oracleIds) {
      const card = cardMap.get(oid);
      if (card) for (const c of card.colorIdentity) colorSet.add(c);
    }
    const wubrg = ["W", "U", "B", "R", "G"];
    const colorIdentity = wubrg.filter((c) => colorSet.has(c));
    if (colorIdentity.length === 0 && oracleIds.length > 0) colorIdentity.push("C");
    return colorIdentity;
  }

  // Front-face image URLs for a player's commanders, in deckObj order (primary
  // commander first, partner second). Capped at 2.
  function commanderImagesFor(playerId: string | null, playerName: string, cardMap: Map<string, ScryfallCard>): string[] {
    return lookupCommanderIds(playerId, playerName)
      .map((id) => cardMap.get(id)?.imageUri)
      .filter((u): u is string => typeof u === "string" && u.length > 0)
      .slice(0, 2);
  }

  async function buildPodSummary(table: TopDeckTable): Promise<PodSummaryData> {
    if (!config) throw new Error("No TopDeck config");
    const tablePlayers = table.players ?? [];
    // Fan out the Scryfall commander batch + per-player W-L-D (from the
    // player-detail endpoint) in parallel. Failed player-detail fetches
    // become null, which `recordFromPlayerDetail` falls back to 0-0-0.
    const [cardMap, detailByPlayer] = await Promise.all([
      getCommanderCardsForTable(table),
      Promise.all(
        tablePlayers.map(async (p) => {
          if (!p.id) return null;
          try {
            return await topdeck.getPlayer(config, p.id);
          } catch {
            return null;
          }
        }),
      ),
    ]);

    const players: PodSummaryPlayer[] = tablePlayers.map((p, i) => {
      const s = standings.find((st) => st.id === p.id || st.name === p.name);
      const record = topdeck.recordFromPlayerDetail(detailByPlayer[i]);
      return {
        name: p.name,
        commanderName: lookupCommander(p.id, p.name),
        commanderImages: commanderImagesFor(p.id, p.name, cardMap),
        colorIdentity: mergedColorIdentity(p.id, p.name, cardMap),
        standing: s?.standing ?? null,
        points: s?.points ?? null,
        wins: record.wins,
        losses: record.losses,
        draws: record.draws,
        opponentWinRate: s?.opponentWinRate ?? null,
      };
    });
    return {
      tournamentName,
      round: currentRound?.round ?? null,
      players,
    };
  }

  async function buildNamePlates(table: TopDeckTable): Promise<NamePlate[]> {
    const cardMap = await getCommanderCardsForTable(table);
    return (table.players ?? []).map((p) => ({
      name: p.name,
      deckName: lookupCommander(p.id, p.name),
      colorIdentity: mergedColorIdentity(p.id, p.name, cardMap),
    }));
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
        <h3 className="text-sm font-medium text-brand truncate">
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
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="text-[10px] text-text-muted whitespace-nowrap">Table {table.table}</span>
                  <StatusBadge status={table.status} />
                  {isStream && (
                    <span className="text-brand text-[10px] font-medium whitespace-nowrap">Stream Pod</span>
                  )}
                </div>
                {table.table !== "Byes" && (
                  <div className="flex items-center gap-1 mb-1.5">
                    {isStream && (
                      <button
                        onClick={async () => {
                          if (podSummaryActive) {
                            onSetPodSummary(null);
                          } else {
                            try {
                              const summary = await buildPodSummary(table);
                              onSetPodSummary(summary);
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Failed to build pod summary");
                            }
                          }
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                          podSummaryActive
                            ? "bg-status-green/25 text-status-green hover:bg-status-green/40"
                            : "bg-gold/15 text-brand hover:bg-gold/30"
                        }`}
                      >
                        {podSummaryActive ? "Hide Summary" : "Show Summary"}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (isStream) {
                          onSetStreamTable(null, null);
                          if (podSummaryActive) onSetPodSummary(null);
                        } else {
                          try {
                            if (!config) throw new Error("No TopDeck config");
                            const [plates, detailByPlayer] = await Promise.all([
                              buildNamePlates(table),
                              Promise.all(
                                table.players.map(async (p) => {
                                  if (!p.id) return null;
                                  try { return await topdeck.getPlayer(config, p.id); }
                                  catch { return null; }
                                }),
                              ),
                            ]);
                            const stats: StreamPlayerStats[] = table.players.map((p, i) => {
                              const s = standings.find((st) => st.id === p.id || st.name === p.name);
                              const record = topdeck.recordFromPlayerDetail(detailByPlayer[i]);
                              return {
                                  standing: s?.standing ?? null,
                                  wins: record.wins,
                                  losses: record.losses,
                                  draws: record.draws,
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
                            ? "bg-gold/20 text-brand hover:bg-gold/30"
                            : "text-text-muted hover:text-brand hover:bg-bg-overlay"
                        }`}
                      >
                        {isStream ? "Unset Stream Pod" : "Set as Stream Pod"}
                      </button>
                    </div>
                  )}
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
                        <span className={`text-xs ${isStream ? "text-brand" : "text-text-primary"}`}>
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

function StatusBadge({ status }: { status: TopDeckTable["status"] }) {
  const styles: Record<TopDeckTable["status"], string> = {
    Active: "bg-status-green/15 text-status-green border border-status-green/40",
    Completed: "bg-bg-overlay text-text-dim border border-text-muted/30",
    Pending: "bg-bg-overlay text-text-muted border border-text-muted/20",
    Bye: "bg-bg-overlay text-text-muted border border-text-muted/20",
  };
  const label: Record<TopDeckTable["status"], string> = {
    Active: "● Live",
    Completed: "✓ Done",
    Pending: "Pending",
    Bye: "Bye",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider leading-none whitespace-nowrap inline-block ${styles[status]}`}>
      {label[status]}
    </span>
  );
}
