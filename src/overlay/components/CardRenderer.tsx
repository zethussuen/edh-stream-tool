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

  useEffect(() => {
    const currentIds = new Set(cards.map((c) => c.id));

    setTracked((prev) => {
      const next = new Map(prev);

      // New cards → entering
      for (const card of cards) {
        if (!prev.has(card.id)) {
          next.set(card.id, { card, anim: "entering" });
        } else {
          // Update card data, keep anim state
          const existing = next.get(card.id)!;
          next.set(card.id, { ...existing, card });
        }
      }

      // Removed cards → exiting
      for (const id of prevIds.current) {
        if (!currentIds.has(id) && prev.has(id)) {
          const existing = prev.get(id)!;
          if (existing.anim !== "exiting") {
            next.set(id, { ...existing, anim: "exiting" });
          }
        }
      }

      prevIds.current = currentIds;
      return next;
    });
  }, [cards]);

  // Transition entering → visible after animation
  useEffect(() => {
    const entering = [...tracked.values()].filter(
      (t) => t.anim === "entering",
    );
    if (entering.length === 0) return;

    const timer = setTimeout(() => {
      setTracked((prev) => {
        const next = new Map(prev);
        for (const t of entering) {
          const current = next.get(t.card.id);
          if (current?.anim === "entering") {
            next.set(t.card.id, { ...current, anim: "visible" });
          }
        }
        return next;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [tracked]);

  // Remove exiting cards after animation
  useEffect(() => {
    const exiting = [...tracked.entries()].filter(
      ([, t]) => t.anim === "exiting",
    );
    if (exiting.length === 0) return;

    const timer = setTimeout(() => {
      setTracked((prev) => {
        const next = new Map(prev);
        for (const [id] of exiting) {
          next.delete(id);
        }
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [tracked]);

  return (
    <>
      {[...tracked.values()].map(({ card, anim }) => (
        <img
          key={card.id}
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
              anim === "entering"
                ? "scale(1)"
                : anim === "exiting"
                  ? "scale(0.8)"
                  : "scale(1)",
            opacity: anim === "exiting" ? 0 : 1,
            pointerEvents: "none",
          }}
          // Trigger enter animation: mount at scale(0.7), CSS transitions to scale(1)
          ref={(el) => {
            if (el && anim === "entering") {
              el.style.transform = "scale(0.7)";
              el.offsetHeight; // force reflow
              el.style.transform = "scale(1)";
            }
          }}
        />
      ))}
    </>
  );
}
