import type { NamePlate, NameplateStyle, StreamPlayerStats } from "@shared/types";
import { ManaCost } from "@shared/components/ManaCost";

interface Props {
  plates: NamePlate[] | null;
  stats?: StreamPlayerStats[] | null;
  style?: NameplateStyle;
}

// Seat positions: 1=top-left, 2=top-right, 3=bottom-right, 4=bottom-left (clockwise)
type Align = "left" | "right";
type Vert = "top" | "bottom";
const SEAT_VERT: Vert[] = ["top", "top", "bottom", "bottom"];
const SEAT_ALIGN: Align[] = ["left", "right", "right", "left"];

function anchor(idx: number, margin = 0): React.CSSProperties {
  const v = SEAT_VERT[idx];
  const h = SEAT_ALIGN[idx];
  // Build a typed object so the dynamic key doesn't widen to any.
  const out: React.CSSProperties = {};
  (out as Record<string, number>)[v] = margin;
  (out as Record<string, number>)[h] = margin;
  return out;
}

interface PlateProps {
  idx: number;
  plate: NamePlate;
  stats: StreamPlayerStats | undefined;
}

export function NamePlates({ plates, stats, style = "classic" }: Props) {
  if (!plates || plates.length === 0) return null;

  return (
    <>
      {plates.slice(0, 4).map((plate, i) => {
        const s = stats?.[i];
        const key = `plate-${i}`;
        switch (style) {
          case "fighter":
            return <FighterPlate key={key} idx={i} plate={plate} stats={s} />;
          case "glass":
            return <GlassPlate key={key} idx={i} plate={plate} stats={s} />;
          case "broadcast":
            return <BroadcastPlate key={key} idx={i} plate={plate} stats={s} />;
          case "classic":
          default:
            return <ClassicPlate key={key} idx={i} plate={plate} stats={s} />;
        }
      })}
      <NameplateKeyframes />
    </>
  );
}

// ── Classic — the original MTG-paper look ──

const CLASSIC_RADII = ["0 0 16px 0", "0 0 0 16px", "16px 0 0 0", "0 16px 0 0"];

function ClassicPlate({ idx, plate, stats }: PlateProps) {
  const align = SEAT_ALIGN[idx];
  return (
    <div
      style={{
        position: "absolute",
        ...anchor(idx, 0),
        textAlign: align,
        zIndex: 50,
        animation: "nameplate-classic-in 0.4s ease forwards",
      }}
    >
      <div
        style={{
          background: "rgba(0, 0, 0, 0.97)",
          padding: "12px 20px",
          backdropFilter: "blur(4px)",
          minWidth: 160,
          borderRadius: CLASSIC_RADII[idx],
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 30,
            lineHeight: 1.15,
            color: "#e4e0d8",
            margin: 0,
            letterSpacing: "0.5px",
          }}
        >
          {plate.name}
        </p>
        {(plate.deckName || plate.colorIdentity?.length > 0) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              margin: "4px 0 0 0",
              justifyContent: align === "right" ? "flex-end" : "flex-start",
            }}
          >
            {plate.colorIdentity?.length > 0 && (
              <ManaCost
                cost={plate.colorIdentity.map((c) => `{${c}}`).join("")}
                size={17}
                gap={2}
              />
            )}
            {plate.deckName && (
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 16,
                  lineHeight: 1.25,
                  color: "var(--color-brand)",
                }}
              >
                {plate.deckName}
              </span>
            )}
          </div>
        )}
        {stats && (
          <p
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 14,
              lineHeight: 1.3,
              color: "#a8a499",
              letterSpacing: "0.5px",
              margin: "3px 0 0 0",
            }}
          >
            {stats.standing != null && (
              <span style={{ color: "var(--color-brand)" }}>#{stats.standing}</span>
            )}
            {stats.standing != null && " · "}
            {stats.wins}-{stats.losses}-{stats.draws}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Fighter — big italic seat number + bold slanted name + aggressive cut ──
// Street Fighter / Tekken HUD vibe: a P1-style number block in an accent
// gradient sits against the screen edge; the body has italic uppercase name +
// stats; a wide diagonal slice removes the inner-to-screen corner.

const FIGHTER_CUT = 28;
const FIGHTER_CLIPS = [
  // seat 1 (TL anchor) — cut BR
  `polygon(0 0, 100% 0, 100% calc(100% - ${FIGHTER_CUT}px), calc(100% - ${FIGHTER_CUT}px) 100%, 0 100%)`,
  // seat 2 (TR anchor) — cut BL
  `polygon(0 0, 100% 0, 100% 100%, ${FIGHTER_CUT}px 100%, 0 calc(100% - ${FIGHTER_CUT}px))`,
  // seat 3 (BR anchor) — cut TL
  `polygon(${FIGHTER_CUT}px 0, 100% 0, 100% 100%, 0 100%, 0 ${FIGHTER_CUT}px)`,
  // seat 4 (BL anchor) — cut TR
  `polygon(0 0, calc(100% - ${FIGHTER_CUT}px) 0, 100% ${FIGHTER_CUT}px, 100% 100%, 0 100%)`,
];
// Seat-number block sits against the screen edge (left for left-aligned
// seats, right for right-aligned seats).
const FIGHTER_BLOCK_SIDE: Align[] = ["left", "right", "right", "left"];

function FighterPlate({ idx, plate, stats }: PlateProps) {
  const align = SEAT_ALIGN[idx];
  const blockSide = FIGHTER_BLOCK_SIDE[idx];
  const animation =
    align === "left"
      ? "nameplate-fighter-from-left 0.55s cubic-bezier(0.2, 1.4, 0.3, 1) forwards"
      : "nameplate-fighter-from-right 0.55s cubic-bezier(0.2, 1.4, 0.3, 1) forwards";

  const seatBlock = (
    <div
      style={{
        width: 72,
        flexShrink: 0,
        background:
          "linear-gradient(135deg, var(--color-brand) 0%, rgba(0, 0, 0, 0.6) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-heading)",
        fontSize: 54,
        fontStyle: "italic",
        fontWeight: 900,
        lineHeight: 1,
        color: "#0a0a0c",
        textShadow: "1px 1px 0 rgba(0, 0, 0, 0.18)",
      }}
    >
      {idx + 1}
    </div>
  );

  const divider = (
    <div
      style={{
        width: 2,
        flexShrink: 0,
        background: "var(--color-brand)",
        boxShadow: "0 0 10px var(--color-brand)",
      }}
    />
  );

  const body = (
    <div
      style={{
        flex: 1,
        background: "rgba(10, 10, 12, 0.95)",
        padding: "10px 22px",
        minWidth: 230,
        textAlign: align,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 32,
          lineHeight: 1.1,
          color: "#f3efe7",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          fontStyle: "italic",
          fontWeight: 700,
        }}
      >
        {plate.name}
      </div>
      {(plate.deckName || plate.colorIdentity?.length > 0) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            marginTop: 5,
            justifyContent: align === "right" ? "flex-end" : "flex-start",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 15,
            lineHeight: 1.25,
            color: "#cfcabd",
            letterSpacing: "0.5px",
          }}
        >
          {plate.colorIdentity?.length > 0 && (
            <ManaCost
              cost={plate.colorIdentity.map((c) => `{${c}}`).join("")}
              size={16}
              gap={2}
            />
          )}
          {plate.deckName && <span>{plate.deckName}</span>}
        </div>
      )}
      {stats && (
        <div
          style={{
            marginTop: 4,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 14,
            lineHeight: 1.2,
            color: "#a8a499",
            letterSpacing: "1.2px",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          {stats.standing != null && (
            <span style={{ color: "var(--color-brand)", fontWeight: 700 }}>
              #{stats.standing}
            </span>
          )}
          {stats.standing != null && " · "}
          {stats.wins}-{stats.losses}-{stats.draws}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        ...anchor(idx, 0),
        zIndex: 50,
        animation,
        display: "flex",
        flexDirection: blockSide === "left" ? "row" : "row-reverse",
        clipPath: FIGHTER_CLIPS[idx],
        filter: "drop-shadow(0 4px 14px rgba(0, 0, 0, 0.55))",
      }}
    >
      {seatBlock}
      {divider}
      {body}
    </div>
  );
}

// ── Glass — frosted floating pill, low-key streamer aesthetic ──

function GlassPlate({ idx, plate, stats }: PlateProps) {
  const align = SEAT_ALIGN[idx];
  return (
    <div
      style={{
        position: "absolute",
        ...anchor(idx, 18),
        textAlign: align,
        zIndex: 50,
        animation: "nameplate-glass-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 100%)",
          padding: "11px 22px",
          minWidth: 170,
          borderRadius: 14,
          border: "1px solid rgba(255, 255, 255, 0.14)",
          backdropFilter: "blur(18px) saturate(160%)",
          WebkitBackdropFilter: "blur(18px) saturate(160%)",
          boxShadow:
            "0 6px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 26,
            lineHeight: 1.15,
            color: "#f3efe7",
            margin: 0,
            letterSpacing: "0.5px",
          }}
        >
          {plate.name}
        </p>
        {(plate.deckName || plate.colorIdentity?.length > 0) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginTop: 4,
              justifyContent: align === "right" ? "flex-end" : "flex-start",
            }}
          >
            {plate.colorIdentity?.length > 0 && (
              <ManaCost
                cost={plate.colorIdentity.map((c) => `{${c}}`).join("")}
                size={15}
                gap={2}
              />
            )}
            {plate.deckName && (
              <span
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 15,
                  lineHeight: 1.25,
                  color: "rgba(244, 240, 232, 0.88)",
                }}
              >
                {plate.deckName}
              </span>
            )}
          </div>
        )}
        {stats && (
          <p
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 14,
              lineHeight: 1.3,
              color: "rgba(244, 240, 232, 0.92)",
              letterSpacing: "0.5px",
              margin: "3px 0 0 0",
              fontWeight: 600,
            }}
          >
            {stats.standing != null && (
              <span style={{ color: "var(--color-brand)" }}>#{stats.standing}</span>
            )}
            {stats.standing != null && " · "}
            {stats.wins}-{stats.losses}-{stats.draws}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Broadcast — TV banner with accent seat block + name/commander stack ──

// Accent block sits on the inner-to-screen edge of the plate (the side that
// "points at" the camera feed). For TL/BL, that's the right side; for TR/BR,
// the left side.
const BROADCAST_BLOCK_SIDE: Align[] = ["right", "left", "left", "right"];

function BroadcastPlate({ idx, plate, stats }: PlateProps) {
  const align = SEAT_ALIGN[idx];
  const blockSide = BROADCAST_BLOCK_SIDE[idx];
  const animation =
    align === "left"
      ? "nameplate-broadcast-from-left 0.5s cubic-bezier(0.2, 0.85, 0.2, 1) forwards"
      : "nameplate-broadcast-from-right 0.5s cubic-bezier(0.2, 0.85, 0.2, 1) forwards";

  const accentBlock = (
    <div
      style={{
        width: 56,
        flexShrink: 0,
        background: "var(--color-brand)",
        color: "#0a0a0c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-heading)",
        fontSize: 34,
        lineHeight: 1,
        letterSpacing: "0.5px",
      }}
    >
      {idx + 1}
    </div>
  );

  const body = (
    <div
      style={{
        flex: 1,
        background: "rgba(8, 8, 10, 0.94)",
        padding: "10px 20px",
        minWidth: 220,
        textAlign: align,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 28,
          lineHeight: 1.1,
          color: "#f3efe7",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        {plate.name}
      </div>
      {(plate.deckName || plate.colorIdentity?.length > 0 || stats) && (
        <div
          style={{
            marginTop: 5,
            paddingTop: 5,
            borderTop: "1px solid var(--color-brand)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            justifyContent: "space-between",
            flexDirection: align === "right" ? "row-reverse" : "row",
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 14,
            lineHeight: 1.25,
            color: "#cfcabd",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
            {plate.colorIdentity?.length > 0 && (
              <ManaCost
                cost={plate.colorIdentity.map((c) => `{${c}}`).join("")}
                size={15}
                gap={2}
              />
            )}
            {plate.deckName && (
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {plate.deckName}
              </span>
            )}
          </div>
          {stats && (
            <span style={{ color: "var(--color-brand)", fontWeight: 700, whiteSpace: "nowrap" }}>
              {stats.standing != null && <>#{stats.standing} · </>}
              {stats.wins}-{stats.losses}-{stats.draws}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        ...anchor(idx, 0),
        zIndex: 50,
        animation,
        display: "flex",
        flexDirection: blockSide === "left" ? "row" : "row-reverse",
        boxShadow: "0 4px 18px rgba(0, 0, 0, 0.45)",
      }}
    >
      {accentBlock}
      {body}
    </div>
  );
}

// ── Shared keyframes ──

function NameplateKeyframes() {
  return (
    <style>{`
      @keyframes nameplate-classic-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes nameplate-fighter-from-left {
        0% { opacity: 0; transform: translateX(-26px) scale(0.94); }
        60% { transform: translateX(3px) scale(1.02); }
        100% { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes nameplate-fighter-from-right {
        0% { opacity: 0; transform: translateX(26px) scale(0.94); }
        60% { transform: translateX(-3px) scale(1.02); }
        100% { opacity: 1; transform: translateX(0) scale(1); }
      }
      @keyframes nameplate-glass-in {
        from { opacity: 0; transform: scale(0.94); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes nameplate-broadcast-from-left {
        from { opacity: 0; transform: translateX(-100%); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes nameplate-broadcast-from-right {
        from { opacity: 0; transform: translateX(100%); }
        to { opacity: 1; transform: translateX(0); }
      }
    `}</style>
  );
}
