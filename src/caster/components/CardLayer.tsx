import { useCallback, useRef } from "react";
import type { OverlayCard } from "@shared/types";
import { HugeiconsIcon } from "@hugeicons/react";
import { FlipHorizontalIcon } from "@hugeicons/core-free-icons";

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
    moved: boolean;
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
        moved: false,
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
      if (!ds.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        ds.moved = true;
      }
      if (ds.moved) {
        emit("card:move", {
          id: ds.id,
          x: Math.round(ds.cardX + dx),
          y: Math.round(ds.cardY + dy),
        });
      }
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
        touchAction: "none",
      }}
    >
      {cards.map((card) => {
        const src = card.flipped && card.backFace ? card.backFace.imageUri : card.imageUri;
        const altName = card.flipped && card.backFace ? card.backFace.name : card.name;
        const isDFC = !!card.backFace;

        return (
          <div
            key={card.id}
            className="group"
            style={{
              position: "absolute",
              left: card.x,
              top: card.y,
              width: card.width,
              height: card.height,
              zIndex: card.zIndex,
            }}
          >
            <img
              src={src}
              alt={altName}
              title="Drag to move · Double-click to spotlight · Right-click to remove"
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 12,
                cursor: interactive ? "grab" : "default",
                userSelect: "none",
                touchAction: "none",
                display: "block",
              }}
              onPointerDown={(e) => onPointerDown(e, card)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onContextMenu={(e) => onContextMenu(e, card)}
              onDoubleClick={() => onDoubleClick(card)}
            />
            {isDFC && interactive && (
              <button
                title="Flip card"
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  emit("card:flip", { id: card.id });
                }}
                className="opacity-0 group-hover:opacity-100 hover:!bg-black/90"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.7)",
                  border: "2px solid rgba(200, 170, 110, 0.85)",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.5), 0 0 24px rgba(200, 170, 110, 0.35)",
                  color: "#c8aa6e",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  transition: "opacity 0.15s ease, background 0.15s ease",
                }}
              >
                <HugeiconsIcon icon={FlipHorizontalIcon} size={32} color="currentColor" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
