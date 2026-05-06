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

    setTracked((prev) => {
      const next = new Map(prev);
      const newEntering: string[] = [];
      const newExiting: string[] = [];

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

      return next;
    });
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
  const mounted = useRef(false);

  return (
    <img
      src={card.imageUri}
      alt={card.name}
      draggable={false}
      style={{
        position: "absolute",
        left: card.x,
        top: card.y,
        width: card.width,
        height: card.height,
        zIndex: card.zIndex,
        borderRadius: 12,
        transition:
          anim === "entering"
            ? "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease"
            : anim === "exiting"
              ? "transform 0.3s ease, opacity 0.3s ease"
              : "none",
        transform:
          anim === "entering" && mounted.current
            ? "scale(1)"
            : anim === "exiting"
              ? "scale(0.8)"
              : "scale(1)",
        opacity: anim === "exiting" ? 0 : 1,
        pointerEvents: "none",
      }}
      ref={(el) => {
        if (el && !mounted.current) {
          mounted.current = true;
          el.style.transform = "scale(0.7)";
          el.offsetHeight;
          el.style.transform = "";
        }
      }}
    />
  );
}
