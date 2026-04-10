import { useCallback, useEffect, useState } from "react";
import type { TopDeckConfig, TopDeckStanding, TopDeckRound, ScryfallCard } from "@shared/types";
import * as topdeck from "@shared/topdeck";
import * as scryfall from "@shared/scryfall";
import { cardAddPayload } from "@shared/cards";

interface Props {
  config: TopDeckConfig | null;
  emit: (event: string, data?: unknown) => void;
}

export function TournamentPanel({ config, emit }: Props) {
  const [standings, setStandings] = useState<TopDeckStanding[]>([]);
  const [currentRound, setCurrentRound] = useState<TopDeckRound | null>(null);
  const [tournamentName, setTournamentName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingPlayer, setLoadingPlayer] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!config?.apiKey || !config?.tournamentId) return;
    setLoading(true);
    setError("");
    try {
      const [tournament, round] = await Promise.all([
        topdeck.getTournament(config),
        topdeck.getLatestRound(config).catch(() => null),
      ]);
      setTournamentName(tournament.data?.name ?? "Tournament");
      setStandings(tournament.standings ?? []);
      setCurrentRound(round);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch tournament");
    } finally {
      setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadPlayerDeck = useCallback(
    async (standing: TopDeckStanding) => {
      if (!standing.deckObj && !standing.decklist) return;
      setLoadingPlayer(standing.name);

      try {
        if (standing.deckObj) {
          // Load from structured deckObj with Scryfall IDs
          for (const [, cards] of Object.entries(standing.deckObj)) {
            for (const [, data] of Object.entries(cards)) {
              try {
                const card = await scryfall.getById(data.id);
                addCardToOverlay(card, emit);
              } catch {
                // skip
              }
            }
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load deck");
      } finally {
        setLoadingPlayer(null);
      }
    },
    [emit],
  );

  if (!config?.apiKey || !config?.tournamentId) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm text-text-dim">No tournament configured</p>
        <p className="text-xs text-text-muted">
          Set your TopDeck.gg API key and Tournament ID in Settings
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gold truncate">
          {tournamentName || "Tournament"}
        </h3>
        <button
          onClick={fetchData}
          disabled={loading}
          className="h-6 rounded bg-bg-surface px-2 text-[10px] text-text-dim hover:bg-bg-overlay transition-colors"
        >
          {loading ? "..." : "Refresh"}
        </button>
      </div>

      {error && <p className="text-xs text-status-red">{error}</p>}

      {/* Current round */}
      {currentRound?.tables && (
        <div className="mb-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-1">
            Round {currentRound.round}
          </p>
          {currentRound.tables.map((table) => (
            <div
              key={typeof table.table === "number" ? table.table : "byes"}
              className="rounded bg-bg-surface p-2 mb-1"
            >
              <p className="text-[10px] text-text-muted mb-1">
                Table {table.table}
                {table.status !== "Pending" && (
                  <span className="ml-1 text-text-dim">({table.status})</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1">
                {(table.players ?? []).map((p) => (
                  <span
                    key={p.name}
                    className="rounded bg-bg-overlay px-2 py-0.5 text-xs text-text-primary"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Standings */}
      <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
        Standings ({standings.length})
      </p>
      <div className="flex flex-col gap-1">
        {standings.map((s) => (
          <button
            key={s.name}
            onClick={() => loadPlayerDeck(s)}
            disabled={loadingPlayer === s.name || (!s.deckObj && !s.decklist)}
            className="flex items-center gap-2 rounded p-2 text-left hover:bg-bg-surface transition-colors disabled:opacity-50"
          >
            <span className="text-xs text-text-muted w-6 text-right shrink-0">
              #{s.standing}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">{s.name}</p>
              <p className="text-xs text-text-dim">
                {s.points}pts · {Math.round(s.winRate * 100)}% WR
                {s.wins != null && ` · ${s.wins}-${s.losses}-${s.draws}`}
              </p>
            </div>
            {(s.deckObj || s.decklist) && (
              <span className="text-[10px] text-gold shrink-0">
                {loadingPlayer === s.name ? "Loading..." : "Deck →"}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function addCardToOverlay(
  card: ScryfallCard,
  emit: (event: string, data?: unknown) => void,
) {
  emit("card:add", cardAddPayload(card));
}
