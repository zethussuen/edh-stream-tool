import { useCallback, useRef } from "react";
import type { OverlayCard, ScryfallCard } from "@shared/types";
import { DEFAULT_CARD_HEIGHT, DEFAULT_CARD_WIDTH, OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";

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

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;

      const card: ScryfallCard = JSON.parse(raw);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = Math.round((e.clientX - rect.left) / scale - DEFAULT_CARD_WIDTH / 2);
      const y = Math.round((e.clientY - rect.top) / scale - DEFAULT_CARD_HEIGHT / 2);

      emit("card:add", {
        scryfallId: card.scryfallId,
        name: card.name,
        imageUri: card.imageUri,
        imageUriLarge: card.imageUriLarge,
        artCropUri: card.artCropUri,
        artist: card.artist,
        manaCost: card.manaCost,
        typeLine: card.typeLine,
        oracleText: card.oracleText,
        x: Math.max(0, Math.min(x, OVERLAY_WIDTH - DEFAULT_CARD_WIDTH)),
        y: Math.max(0, Math.min(y, OVERLAY_HEIGHT - DEFAULT_CARD_HEIGHT)),
        width: DEFAULT_CARD_WIDTH,
        height: DEFAULT_CARD_HEIGHT,
        spotlight: false,
      });
    },
    [scale, emit],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
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
