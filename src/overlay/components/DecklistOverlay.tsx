import { ManaCost } from "@shared/components/ManaCost";
import type { DecklistOverlayData, DecklistOverlaySection } from "@shared/types";

interface Props {
  data: DecklistOverlayData | null;
}

function SectionBlock({ section }: { section: DecklistOverlaySection }) {
  return (
    <div style={{ breakInside: "avoid", marginBottom: 16 }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          marginBottom: 6,
          borderBottom: "1px solid rgba(200, 170, 110, 0.3)",
          paddingBottom: 4,
        }}
      >
        <span
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 20,
            color: "#c8aa6e",
            letterSpacing: 1,
          }}
        >
          {section.name}
        </span>
        <span
          style={{
            fontSize: 14,
            color: "rgba(200, 170, 110, 0.6)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          ({section.cards.reduce((sum, c) => sum + c.quantity, 0)})
        </span>
      </div>

      {/* Card list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {section.cards.map((card, i) => (
          <div
            key={`${card.name}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "2px 0",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            <span
              style={{
                color: "rgba(228, 224, 216, 0.5)",
                width: 16,
                textAlign: "right",
                flexShrink: 0,
              }}
            >
              {card.quantity}
            </span>
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
              <ManaCost cost={card.manaCost} size={14} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DecklistOverlay({ data }: Props) {
  if (!data || data.sections.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        padding: "32px 48px",
        background:
          "linear-gradient(135deg, rgba(9, 9, 11, 0.92) 0%, rgba(19, 19, 22, 0.92) 100%)",
      }}
    >
      {/* Header: player name + commander */}
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 36,
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
              fontSize: 16,
              color: "#c8aa6e",
              marginTop: 4,
            }}
          >
            {data.commanderName}
          </div>
        )}
      </div>

      {/* Card sections in CSS columns */}
      <div
        style={{
          flex: 1,
          columnCount: 3,
          columnGap: 40,
          columnFill: "auto",
          overflow: "hidden",
        }}
      >
        {data.sections.map((section) => (
          <SectionBlock key={section.name} section={section} />
        ))}
      </div>
    </div>
  );
}
