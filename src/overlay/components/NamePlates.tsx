import type { NamePlate } from "@shared/types";
import { ManaCost } from "@shared/components/ManaCost";

interface Props {
  plates: NamePlate[] | null;
}

// Seat positions: 1=top-left, 2=top-right, 3=bottom-right, 4=bottom-left (clockwise)
const POSITIONS = [
  { top: 0, left: 0, align: "left" },
  { top: 0, right: 0, align: "right" },
  { bottom: 0, right: 0, align: "right" },
  { bottom: 0, left: 0, align: "left" },
] as const;

const BORDER_RADII = [
  "0 0 16px 0",
  "0 0 0 16px",
  "16px 0 0 0",
  "0 16px 0 0",
];

const nameStyle: React.CSSProperties = {
  fontFamily: '"Bebas Neue", sans-serif',
  fontSize: 24,
  lineHeight: 1.1,
  color: "#e4e0d8",
  margin: 0,
  letterSpacing: "0.5px",
};

const deckNameStyle: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 14,
  lineHeight: 1.2,
  color: "#c8aa6e",
};

const panelBase: React.CSSProperties = {
  background: "rgba(0, 0, 0, 0.97)",
  padding: "10px 16px",
  backdropFilter: "blur(4px)",
  minWidth: 120,
};

export function NamePlates({ plates }: Props) {
  if (!plates || plates.length === 0) return null;

  return (
    <>
      {plates.slice(0, 4).map((plate, i) => {
        const pos = POSITIONS[i];
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              ...("top" in pos ? { top: pos.top } : {}),
              ...("bottom" in pos ? { bottom: pos.bottom } : {}),
              ...("left" in pos ? { left: pos.left } : {}),
              ...("right" in pos ? { right: pos.right } : {}),
              textAlign: pos.align as "left" | "right",
              zIndex: 50,
              animation: "nameplate-in 0.4s ease forwards",
            }}
          >
            <div style={{ ...panelBase, borderRadius: BORDER_RADII[i] }}>
              <p style={nameStyle}>{plate.name}</p>
              {(plate.deckName || plate.colorIdentity?.length > 0) && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    margin: "2px 0 0 0",
                    justifyContent: pos.align === "right" ? "flex-end" : "flex-start",
                  }}
                >
                  {plate.colorIdentity?.length > 0 && (
                    <ManaCost
                      cost={plate.colorIdentity.map((c) => `{${c}}`).join("")}
                      size={14}
                      gap={2}
                    />
                  )}
                  {plate.deckName && (
                    <span style={deckNameStyle}>{plate.deckName}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes nameplate-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
