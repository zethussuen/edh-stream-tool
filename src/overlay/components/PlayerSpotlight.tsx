import { useEffect, useRef } from "react";
import { ManaCost } from "@shared/components/ManaCost";
import type { PlayerSpotlightData, TopDeckProfileTournamentEntry } from "@shared/types";

const SCROLL_SPEED = 30; // px/s
const PAUSE_MS = 3500;

interface Props {
  data: PlayerSpotlightData | null;
}

// Commander stack on the left. Matches pod-summary card dimensions but a touch
// larger since this overlay only shows one player.
const CARD_WIDTH = 280;
const CARD_HEIGHT = Math.round(CARD_WIDTH * (7 / 5));

function CommanderStack({ images }: { images: string[] }) {
  return (
    <div
      style={{
        position: "relative",
        width: CARD_WIDTH + 56,
        height: CARD_HEIGHT + 30,
        flexShrink: 0,
      }}
    >
      {images[1] && (
        <img
          src={images[1]}
          alt=""
          style={{
            position: "absolute",
            top: 14,
            left: 0,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            transform: "rotate(-9deg)",
            transformOrigin: "center",
            borderRadius: 14,
            boxShadow: "0 10px 28px rgba(0,0,0,0.75)",
            zIndex: 1,
          }}
        />
      )}
      {images[0] && (
        <img
          src={images[0]}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 44,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: 14,
            boxShadow: "0 14px 36px rgba(0,0,0,0.8)",
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}

function StatBlock({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
      <span
        style={{
          fontSize: 14,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: "#8a8678",
          marginBottom: 12,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 48,
          color: accent ? "var(--color-brand)" : "#e4e0d8",
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "22px 26px",
        background: "linear-gradient(135deg, rgba(20,20,24,0.85), rgba(10,10,12,0.85))",
        border: "1px solid color-mix(in srgb, var(--color-brand) 22%, transparent)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <span
        style={{
          fontSize: 16,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          color: "#8a8678",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 44,
          color: accent ? "var(--color-brand)" : "#e4e0d8",
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function formatPct(rate: number | null | undefined): string {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${Math.round(rate * 100)}%`;
}

function formatYearMonth(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 7);
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function TopFinishCard({ t }: { t: TopDeckProfileTournamentEntry }) {
  const isFirst = t.placementNumber === 1;
  return (
    <div
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        columnGap: 14,
        rowGap: 3,
        alignItems: "baseline",
        fontFamily: "'JetBrains Mono', monospace",
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: 22,
          color: isFirst ? "var(--color-brand)" : "#e4e0d8",
          fontWeight: 600,
          lineHeight: 1,
          minWidth: 48,
        }}
      >
        {t.placement}
      </span>
      <span
        style={{
          fontSize: 15,
          color: "#e4e0d8",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.2,
        }}
      >
        {t.name}
      </span>
      <span style={{ gridColumn: 2, fontSize: 12, color: "#55524a", letterSpacing: 0.4 }}>
        {t.record} · {formatYearMonth(t.date)} · {t.size}p
      </span>
    </div>
  );
}

function useAutoScroll(resetKey: string) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!resetKey) return;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    content.style.transform = "translateY(0)";

    let raf = 0;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      const maxScroll = Math.max(0, content.scrollHeight - viewport.clientHeight);
      if (maxScroll <= 0) return;

      type Phase = "pause-top" | "down" | "pause-bottom" | "up";
      let phase: Phase = "pause-top";
      let phaseStart = performance.now();

      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - phaseStart;
        let y = 0;
        if (phase === "pause-top") {
          y = 0;
          if (elapsed >= PAUSE_MS) { phase = "down"; phaseStart = now; }
        } else if (phase === "down") {
          y = Math.min(maxScroll, (elapsed / 1000) * SCROLL_SPEED);
          if (y >= maxScroll) { y = maxScroll; phase = "pause-bottom"; phaseStart = now; }
        } else if (phase === "pause-bottom") {
          y = maxScroll;
          if (elapsed >= PAUSE_MS) { phase = "up"; phaseStart = now; }
        } else {
          y = Math.max(0, maxScroll - (elapsed / 1000) * SCROLL_SPEED);
          if (y <= 0) { y = 0; phase = "pause-top"; phaseStart = now; }
        }
        content.style.transform = `translateY(${-y}px)`;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    // Two rAFs so grid layout has flushed before we measure.
    raf = requestAnimationFrame(() => { raf = requestAnimationFrame(start); });

    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [resetKey]);

  return { viewportRef, contentRef };
}

export function PlayerSpotlight({ data }: Props) {
  // Hook order must be stable, so compute resetKey + call useAutoScroll before
  // any early return. resetKey changes when the spotlighted player changes,
  // which restarts the scroll loop from the top.
  const resetKey = data
    ? `${data.uid}|${data.profile?.gameFormats?.[data.format]?.length ?? 0}`
    : "";
  const { viewportRef, contentRef } = useAutoScroll(resetKey);

  if (!data) return null;

  const profile = data.profile;
  const formatKey = data.format;
  const tournaments = profile?.gameFormats?.[formatKey] ?? [];
  const topFinishes = profile?.topFinishes?.[formatKey];

  // Lifetime totals: sum across all years for this format
  const lifetime = Object.values(profile?.yearlyStats ?? {}).reduce(
    (acc, year) => {
      const entry = year[formatKey];
      if (!entry) return acc;
      acc.wins += entry.wins;
      acc.losses += entry.losses;
      acc.draws += entry.draws;
      acc.tournaments += entry.totalTournaments;
      return acc;
    },
    { wins: 0, losses: 0, draws: 0, tournaments: 0 },
  );
  const lifetimeGames = lifetime.wins + lifetime.losses + lifetime.draws;
  const lifetimeWinRate = lifetimeGames > 0 ? lifetime.wins / lifetimeGames : null;

  // Top finishes feed: best placement first (1st > 2nd > ...), then most recent.
  // A finish only counts as "top" if it landed inside the event's actual top cut.
  // Events with no top cut fall back to a 16-place cutoff so we don't lose data
  // for older tournaments where topCut isn't reported.
  const recentTop = [...tournaments]
    .filter((t) => {
      if (t.placementNumber <= 0) return false;
      const cutoff = t.topCut ?? 16;
      return t.placementNumber <= cutoff;
    })
    .sort((a, b) => {
      if (a.placementNumber !== b.placementNumber) return a.placementNumber - b.placementNumber;
      return (b.date ?? "").localeCompare(a.date ?? "");
    })
    .slice(0, 36);

  const currentRecord = `${data.wins}-${data.losses}-${data.draws}`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9450,
        background: "linear-gradient(135deg, #09090b, #14141c)",
        padding: "56px 72px",
        display: "flex",
        flexDirection: "column",
        gap: 36,
        animation: "playerspotlight-in 0.5s ease forwards",
        color: "#e4e0d8",
      }}
    >
      {/* Eyebrow */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 44,
            color: "var(--color-brand)",
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          PLAYER SPOTLIGHT
        </span>
      </div>

      {/* Hero row: commander stack + identity + current-tournament strip */}
      <div style={{ display: "flex", gap: 56, alignItems: "stretch", flexShrink: 0 }}>
        <CommanderStack images={data.commanderImages} />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 24,
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 22,
                color: "#e4e0d8",
              }}
            >
              {data.commanderName && <span>{data.commanderName}</span>}
              {data.colorIdentity.length > 0 && (
                <ManaCost
                  cost={data.colorIdentity.map((c) => `{${c}}`).join("")}
                  size={24}
                  gap={4}
                />
              )}
            </div>
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 128,
                color: "#e4e0d8",
                letterSpacing: 3,
                lineHeight: 0.95,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {data.name}
            </div>
          </div>

          {/* Current-tournament strip */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 56,
              paddingTop: 22,
              borderTop: "1px solid color-mix(in srgb, var(--color-brand) 22%, transparent)",
            }}
          >
            {data.standing != null && <StatBlock label="Rank" value={`#${data.standing}`} accent />}
            <StatBlock label="Record" value={currentRecord} />
            {data.points != null && <StatBlock label="Points" value={String(data.points)} />}
            <StatBlock label="Win Rate" value={formatPct(data.winRate)} />
            {data.opponentWinRate != null && (
              <StatBlock label="OW%" value={formatPct(data.opponentWinRate)} />
            )}
          </div>
        </div>
      </div>

      {/* Lifetime tile row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 28,
            letterSpacing: 3,
            color: "var(--color-brand)",
          }}
        >
          LIFETIME · {formatKey.replace(/^Magic: The Gathering: /, "")}
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <StatTile label="Tournaments" value={String(lifetime.tournaments)} />
          <StatTile label="1st Place" value={String(topFinishes?.firstPlaceFinishes ?? 0)} accent />
          <StatTile label="Top 4" value={String(topFinishes?.top4 ?? 0)} />
          <StatTile label="Top 16" value={String(topFinishes?.top16 ?? 0)} />
          <StatTile label="Win Rate" value={formatPct(lifetimeWinRate)} />
        </div>
      </div>

      {/* Top finishes list */}
      {recentTop.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 28,
              letterSpacing: 3,
              color: "var(--color-brand)",
              flexShrink: 0,
            }}
          >
            TOP FINISHES
          </div>
          <div
            ref={viewportRef}
            style={{
              flex: 1,
              overflow: "hidden",
              position: "relative",
              maskImage: "linear-gradient(to bottom, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)",
            }}
          >
            <div
              ref={contentRef}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                columnGap: 28,
                rowGap: 0,
                willChange: "transform",
              }}
            >
              {recentTop.map((t) => (
                <TopFinishCard key={t.id} t={t} />
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes playerspotlight-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
