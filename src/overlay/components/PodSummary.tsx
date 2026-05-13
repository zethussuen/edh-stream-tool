import { ManaCost } from "@shared/components/ManaCost";
import type { PodSummaryData, PodSummaryPlayer } from "@shared/types";

interface Props {
  data: PodSummaryData | null;
}

// Clockwise seat layout in the 2x2 grid: 1=TL, 2=TR, 3=BR, 4=BL — matches
// the nameplate convention so casters can refer to seats by their on-screen
// physical position. The default row-major flow would swap seats 3 and 4.
type Seat = 1 | 2 | 3 | 4;

const SEAT_GRID_POSITIONS: Record<Seat, { gridRow: number; gridColumn: number }> = {
  1: { gridRow: 1, gridColumn: 1 },
  2: { gridRow: 1, gridColumn: 2 },
  3: { gridRow: 2, gridColumn: 2 },
  4: { gridRow: 2, gridColumn: 1 },
};

// Commander card dimensions inside the player card. MTG card ratio is 5:7
// (Scryfall's `normal` image is 488×680).
const CARD_WIDTH = 180;
const CARD_HEIGHT = Math.round(CARD_WIDTH * (7 / 5)); // 252

function formatOWR(rate: number | null): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

function CommanderStack({ images }: { images: string[] }) {
  return (
    <div
      style={{
        position: "relative",
        width: CARD_WIDTH + 36, // extra width for the rotated back card to peek
        height: CARD_HEIGHT + 20,
        flexShrink: 0,
        alignSelf: "center",
      }}
    >
      {/* Partner (back), rotated CCW and offset down-left to peek out */}
      {images[1] && (
        <img
          src={images[1]}
          alt=""
          style={{
            position: "absolute",
            top: 10,
            left: 0,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            transform: "rotate(-9deg)",
            transformOrigin: "center",
            borderRadius: 9,
            boxShadow: "0 6px 18px rgba(0,0,0,0.7)",
            zIndex: 1,
          }}
        />
      )}
      {/* Primary commander on top */}
      {images[0] && (
        <img
          src={images[0]}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 28,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: 9,
            boxShadow: "0 8px 22px rgba(0,0,0,0.75)",
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}

function PlayerCard({ player, seat }: { player: PodSummaryPlayer; seat: Seat }) {
  const hasImages = player.commanderImages.length > 0;

  return (
    <div
      style={{
        ...SEAT_GRID_POSITIONS[seat],
        display: "flex",
        flexDirection: "column",
        padding: "28px 36px",
        background: "linear-gradient(135deg, rgba(20,20,24,0.96), rgba(10,10,12,0.96))",
        border: "1px solid color-mix(in srgb, var(--color-brand) 25%, transparent)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        minHeight: 220,
        overflow: "hidden",
      }}
    >
      {/* Row 1: cards + identity */}
      <div style={{ display: "flex", gap: 28, flex: 1, minHeight: 0 }}>
        {hasImages && <CommanderStack images={player.commanderImages} />}

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            gap: 8,
          }}
        >
          {/* Eyebrow: seat (row 1), commander + pips (row 2) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18,
              lineHeight: 1.25,
              letterSpacing: 0.5,
            }}
          >
            <span style={{ color: "var(--color-brand)" }}>
              Seat {seat}
            </span>
            {(player.commanderName || player.colorIdentity.length > 0) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  color: "#e4e0d8",
                }}
              >
                {player.commanderName && <span>{player.commanderName}</span>}
                {player.colorIdentity.length > 0 && (
                  <ManaCost
                    cost={player.colorIdentity.map((c) => `{${c}}`).join("")}
                    size={20}
                    gap={3}
                  />
                )}
              </div>
            )}
          </div>

          {/* Player name */}
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 72,
              color: "#e4e0d8",
              letterSpacing: 2,
              lineHeight: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {player.name}
          </div>
        </div>
      </div>

      {/* Row 2: full-width stats */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 48,
          paddingTop: 20,
          marginTop: 20,
          borderTop: "1px solid color-mix(in srgb, var(--color-brand) 22%, transparent)",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {player.standing != null && (
          <Stat label="Rank" value={`#${player.standing}`} />
        )}
        <Stat label="Record" value={`${player.wins}-${player.losses}-${player.draws}`} />
        {player.points != null && (
          <Stat label="Points" value={String(player.points)} />
        )}
        <Stat label="OW%" value={formatOWR(player.opponentWinRate)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
      <span
        style={{
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#8a8678",
          marginBottom: 8,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 38, color: "#e4e0d8", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

export function PodSummary({ data }: Props) {
  if (!data || data.players.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9400,
        background:
          "linear-gradient(135deg, #09090b, #14141c)",
        padding: "56px 72px",
        display: "flex",
        flexDirection: "column",
        animation: "podsummary-in 0.5s ease forwards",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          marginBottom: 32,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 56,
            color: "var(--color-brand)",
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          STREAM POD
        </span>
        {data.tournamentName && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 22,
              color: "#8a8678",
              letterSpacing: 1,
            }}
          >
            · {data.tournamentName}
          </span>
        )}
        {data.round != null && data.round !== "" && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 22,
              color: "#8a8678",
              letterSpacing: 1,
            }}
          >
            · Round {data.round}
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 28,
        }}
      >
        {data.players.slice(0, 4).map((p, i) => (
          <PlayerCard key={`${p.name}-${i}`} player={p} seat={(i + 1) as Seat} />
        ))}
      </div>

      <style>{`
        @keyframes podsummary-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
