import type { SpotlightData } from "@shared/types";
import { ManaCost } from "@shared/components/ManaCost";

interface Props {
  card: SpotlightData | null;
}

export function Spotlight({ card }: Props) {
  if (!card) return null;

  const isDFC = !!card.backFace;
  const flipped = card.flipped && isDFC;

  // Text panel shows whichever face is currently up. We re-key on the face
  // name so the panel cross-fades when flipping, matching the 3D card flip.
  const face = flipped && card.backFace
    ? {
        name: card.backFace.name,
        manaCost: card.backFace.manaCost,
        typeLine: card.backFace.typeLine,
        oracleText: card.backFace.oracleText,
      }
    : {
        name: card.name,
        manaCost: card.manaCost,
        typeLine: card.typeLine,
        oracleText: card.oracleText,
      };

  const cardBoxShadow =
    "0 0 60px color-mix(in srgb, var(--color-gold) 50%, transparent), 0 0 120px color-mix(in srgb, var(--color-gold) 20%, transparent)";

  const faceStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    borderRadius: 24,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    boxShadow: cardBoxShadow,
  };

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
      {/* Card image — 3D flip wrapper */}
      <div
        style={{
          width: 480,
          height: 670,
          perspective: 1600,
          animation: "spotlight-card-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transition: isDFC ? "transform 0.5s ease" : "none",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <img
            src={card.imageUriLarge || card.imageUri}
            alt={card.name}
            draggable={false}
            style={faceStyle}
          />
          {isDFC && (
            <img
              src={card.backFace!.imageUriLarge || card.backFace!.imageUri}
              alt={card.backFace!.name}
              draggable={false}
              style={{ ...faceStyle, transform: "rotateY(180deg)" }}
            />
          )}
        </div>
      </div>

      {/* Card info — cross-fades when face changes */}
      <div
        key={face.name}
        style={{
          maxWidth: 400,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          animation: "spotlight-text-in 0.35s ease forwards",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 56,
            color: "var(--color-brand)",
            margin: 0,
            lineHeight: 1,
            letterSpacing: 2,
          }}
        >
          {face.name}
        </h1>
        {face.manaCost && (
          <div style={{ margin: 0, opacity: 0.8 }}>
            <ManaCost cost={face.manaCost} size={28} gap={6} />
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
          {face.typeLine}
        </p>
        {face.oracleText && (
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
            {face.oracleText}
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
        @keyframes spotlight-text-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
