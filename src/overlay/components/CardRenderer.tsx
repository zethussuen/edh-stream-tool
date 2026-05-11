import { useEffect, useRef, useState } from "react";
import type { OverlayCard } from "@shared/types";

interface Props {
  cards: OverlayCard[];
}

type AnimState = "entering" | "visible" | "exiting";

interface TrackedCard {
  card: OverlayCard;
  anim: AnimState;
}

export function CardRenderer({ cards }: Props) {
  const [tracked, setTracked] = useState<Map<string, TrackedCard>>(new Map());
  const prevIds = useRef(new Set<string>());
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const currentIds = new Set(cards.map((c) => c.id));
    const newEntering: string[] = [];
    const newExiting: string[] = [];

    setTracked((prev) => {
      const next = new Map(prev);

      for (const card of cards) {
        if (!prev.has(card.id)) {
          next.set(card.id, { card, anim: "entering" });
          newEntering.push(card.id);
        } else {
          const existing = next.get(card.id)!;
          next.set(card.id, { ...existing, card });
        }
      }

      for (const id of prevIds.current) {
        if (!currentIds.has(id) && prev.has(id)) {
          const existing = prev.get(id)!;
          if (existing.anim !== "exiting") {
            next.set(id, { ...existing, anim: "exiting" });
            newExiting.push(id);
          }
        }
      }

      prevIds.current = currentIds;
      return next;
    });

    if (newEntering.length > 0) {
      const t = setTimeout(() => {
        timersRef.current.delete(t);
        setTracked((p) => {
          const n = new Map(p);
          for (const id of newEntering) {
            const cur = n.get(id);
            if (cur?.anim === "entering") n.set(id, { ...cur, anim: "visible" });
          }
          return n;
        });
      }, 400);
      timersRef.current.add(t);
    }

    if (newExiting.length > 0) {
      const t = setTimeout(() => {
        timersRef.current.delete(t);
        setTracked((p) => {
          const n = new Map(p);
          for (const id of newExiting) n.delete(id);
          return n;
        });
      }, 300);
      timersRef.current.add(t);
    }
  }, [cards]);

  useEffect(() => {
    return () => {
      for (const t of timersRef.current) clearTimeout(t);
    };
  }, []);

  return (
    <>
      {[...tracked.values()].map(({ card, anim }) => (
        <CardImage key={card.id} card={card} anim={anim} />
      ))}
    </>
  );
}

function CardImage({ card, anim }: { card: OverlayCard; anim: AnimState }) {
  // Two-phase mount: render at scale(0.7) on first paint, then bump to
  // scale(1) on the next frame so the CSS transition runs. Cleaner than the
  // imperative ref-callback reflow trick.
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isDFC = !!card.backFace;
  const exiting = anim === "exiting";
  const scale = exiting ? 0.8 : entered ? 1 : 0.7;

  const containerStyle: React.CSSProperties = {
    position: "absolute",
    left: card.x,
    top: card.y,
    width: card.width,
    height: card.height,
    zIndex: card.zIndex,
    perspective: 1000,
    transition: exiting
      ? "transform 0.3s ease, opacity 0.3s ease"
      : "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease",
    transform: `scale(${scale})`,
    opacity: exiting ? 0 : 1,
  };

  const innerStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    height: "100%",
    transformStyle: "preserve-3d",
    transition: isDFC ? "transform 0.5s ease" : "none",
    transform: card.flipped ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  const faceStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    pointerEvents: "none",
  };

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <img src={card.imageUri} alt={card.name} draggable={false} style={faceStyle} />
        {isDFC && (
          <img
            src={card.backFace!.imageUri}
            alt={card.backFace!.name}
            draggable={false}
            style={{ ...faceStyle, transform: "rotateY(180deg)" }}
          />
        )}
      </div>
    </div>
  );
}
