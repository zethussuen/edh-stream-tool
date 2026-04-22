import type { SpotlightData } from "@shared/types";
import { ManaCost } from "@shared/components/ManaCost";

interface Props {
  card: SpotlightData | null;
}

export function Spotlight({ card }: Props) {
  if (!card) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        background:
          "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)",
        animation: "spotlight-in 0.3s ease forwards",
      }}
    >
      {/* Card image */}
      <img
        src={card.imageUriLarge || card.imageUri}
        alt={card.name}
        draggable={false}
        style={{
          width: 480,
          height: 670,
          borderRadius: 24,
          boxShadow:
            "0 0 60px rgba(200, 170, 110, 0.5), 0 0 120px rgba(200, 170, 110, 0.2)",
          animation: "spotlight-card-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
      />

      {/* Card info */}
      <div style={{ maxWidth: 400, display: "flex", flexDirection: "column", gap: 12 }}>
        <h1
          style={{
            fontFamily: '"Bebas Neue", sans-serif',
            fontSize: 56,
            color: "#c8aa6e",
            margin: 0,
            lineHeight: 1,
            letterSpacing: 2,
          }}
        >
          {card.name}
        </h1>
        {card.manaCost && (
          <div style={{ margin: 0, opacity: 0.8 }}>
            <ManaCost cost={card.manaCost} size={28} gap={6} />
          </div>
        )}
        <p
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 24,
            color: "#8a8678",
            margin: 0,
          }}
        >
          {card.typeLine}
        </p>
        {card.oracleText && (
          <p
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 16,
              color: "#e4e0d8",
              margin: 0,
              lineHeight: 1.5,
              opacity: 0.75,
              whiteSpace: "pre-wrap",
            }}
          >
            {card.oracleText}
          </p>
        )}
      </div>

      <style>{`
        @keyframes spotlight-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spotlight-card-in {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
