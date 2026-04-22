import { useCallback, useRef } from "react";
import type { OverlayCard } from "@shared/types";
import { OVERLAY_WIDTH } from "@shared/constants";

interface Props {
  cards: OverlayCard[];
  scale: number;
  interactive: boolean; // false when a draw tool is active
  emit: (event: string, data?: unknown) => void;
}

export function CardLayer({ cards, scale, interactive, emit }: Props) {
  const dragState = useRef<{
    id: string;
    startX: number;
    startY: number;
    cardX: number;
    cardY: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, card: OverlayCard) => {
      if (e.button !== 0) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragState.current = {
        id: card.id,
        startX: e.clientX,
        startY: e.clientY,
        cardX: card.x,
        cardY: card.y,
      };
      emit("card:bringToFront", { id: card.id });
    },
    [emit],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ds = dragState.current;
      if (!ds) return;
      const dx = (e.clientX - ds.startX) / scale;
      const dy = (e.clientY - ds.startY) / scale;
      emit("card:move", {
        id: ds.id,
        x: Math.round(ds.cardX + dx),
        y: Math.round(ds.cardY + dy),
      });
    },
    [scale, emit],
  );

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  const onContextMenu = useCallback(
    (e: React.MouseEvent, card: OverlayCard) => {
      e.preventDefault();
      emit("card:remove", { id: card.id });
    },
    [emit],
  );

  const onDoubleClick = useCallback(
    (card: OverlayCard) => {
      emit("spotlight:toggle", { id: card.id });
    },
    [emit],
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      {cards.map((card) => (
        <img
          key={card.id}
          src={card.imageUri}
          alt={card.name}
          title="Drag to move · Double-click to spotlight · Right-click to remove"
          draggable={false}
          style={{
            position: "absolute",
            left: card.x,
            top: card.y,
            width: card.width,
            height: card.height,
            zIndex: card.zIndex,
            borderRadius: 12,
            cursor: interactive ? "grab" : "default",
            userSelect: "none",
          }}
          onPointerDown={(e) => onPointerDown(e, card)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onContextMenu={(e) => onContextMenu(e, card)}
          onDoubleClick={() => onDoubleClick(card)}
        />
      ))}
    </div>
  );
}
