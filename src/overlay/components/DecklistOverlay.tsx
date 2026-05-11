import { useEffect, useMemo, useRef } from "react";
import { ManaCost } from "@shared/components/ManaCost";
import type { DecklistOverlayData, DecklistOverlaySection } from "@shared/types";

interface Props {
  data: DecklistOverlayData | null;
}

const SCROLL_SPEED = 40; // px/s
const PAUSE_MS = 3000;

function SectionBlock({ section }: { section: DecklistOverlaySection }) {
  const sortedCards = useMemo(
    () => [...section.cards].sort((a, b) => a.cmc - b.cmc || a.name.localeCompare(b.name)),
    [section.cards],
  );

  return (
    <div style={{ breakInside: "avoid", marginBottom: 28 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 10,
          borderBottom: "1px solid color-mix(in srgb, var(--color-gold) 30%, transparent)",
          paddingBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 34,
            color: "var(--color-brand)",
            letterSpacing: 1.5,
          }}
        >
          {section.name}
        </span>
        <span
          style={{
            fontSize: 22,
            color: "color-mix(in srgb, var(--color-brand) 60%, transparent)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ({section.cards.reduce((sum, c) => sum + c.quantity, 0)})
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sortedCards.map((card, i) => (
          <div
            key={`${card.name}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "3px 0",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 24,
              lineHeight: 1.3,
            }}
          >
            <span
              style={{
                color: "#e4e0d8",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {card.name}
            </span>
            <span style={{ flexShrink: 0 }}>
              <ManaCost cost={card.manaCost} size={24} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DecklistOverlay({ data }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const resetKey = data
    ? `${data.playerName}|${data.sections.length}|${data.sections.reduce((s, x) => s + x.cards.length, 0)}`
    : "";

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
      const viewportH = viewport.clientHeight;
      const contentH = content.scrollHeight;
      const maxScroll = Math.max(0, contentH - viewportH);
      if (maxScroll <= 0) return;

      type Phase = "pause-top" | "down" | "pause-bottom" | "up";
      let phase: Phase = "pause-top";
      let phaseStart = performance.now();

      const tick = (now: number) => {
        const elapsed = now - phaseStart;
        let y = 0;
        if (phase === "pause-top") {
          y = 0;
          if (elapsed >= PAUSE_MS) {
            phase = "down";
            phaseStart = now;
          }
        } else if (phase === "down") {
          y = Math.min(maxScroll, (elapsed / 1000) * SCROLL_SPEED);
          if (y >= maxScroll) {
            y = maxScroll;
            phase = "pause-bottom";
            phaseStart = now;
          }
        } else if (phase === "pause-bottom") {
          y = maxScroll;
          if (elapsed >= PAUSE_MS) {
            phase = "up";
            phaseStart = now;
          }
        } else {
          y = Math.max(0, maxScroll - (elapsed / 1000) * SCROLL_SPEED);
          if (y <= 0) {
            y = 0;
            phase = "pause-top";
            phaseStart = now;
          }
        }
        content.style.transform = `translateY(${-y}px)`;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    // Two rAFs so column layout has flushed before we measure.
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(start);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [resetKey]);

  if (!data || data.sections.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9500,
        display: "flex",
        flexDirection: "column",
        padding: "32px 48px",
        background: "#000",
      }}
    >
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 56,
            color: "#e4e0d8",
            letterSpacing: 2,
            lineHeight: 1,
          }}
        >
          {data.playerName}
        </div>
        {data.commanderName && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 26,
              color: "var(--color-brand)",
              marginTop: 8,
            }}
          >
            {data.commanderName}
          </div>
        )}
      </div>

      <div
        ref={viewportRef}
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          ref={contentRef}
          style={{
            columnCount: 2,
            columnGap: 56,
            columnFill: "balance",
            willChange: "transform",
          }}
        >
          {data.sections.map((section) => (
            <SectionBlock key={section.name} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
