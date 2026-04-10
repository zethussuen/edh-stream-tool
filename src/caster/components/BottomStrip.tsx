import { useCallback } from "react";
import type { OverlayCard, SpotlightData } from "@shared/types";

interface Props {
  cards: OverlayCard[];
  spotlight: SpotlightData | null;
  emit: (event: string, data?: unknown) => void;
}

export function BottomStrip({ cards, spotlight, emit }: Props) {
  const clearAll = useCallback(() => {
    if (window.confirm("Clear all cards from overlay?")) {
      emit("cards:clearAll");
    }
  }, [emit]);

  return (
    <div
      className="flex items-center gap-2 border-t border-border bg-bg-raised px-4"
      style={{ height: 54 }}
    >
      {/* Label */}
      <span className="text-[10px] font-medium uppercase tracking-widest text-text-muted shrink-0">
        On Overlay
      </span>

      {/* Card chips (scrollable) */}
      <div className="flex-1 flex gap-1 overflow-x-auto py-1">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`flex items-center gap-1.5 rounded px-2 py-1 shrink-0 ${
              spotlight?.name === card.name
                ? "bg-gold/20 border border-gold/40"
                : "bg-bg-surface"
            }`}
          >
            <img
              src={card.imageUri}
              alt={card.name}
              className="rounded"
              style={{ width: 24, height: 34 }}
            />
            <span className="text-xs text-text-primary max-w-[100px] truncate">
              {card.name}
            </span>
            <button
              onClick={() => emit("spotlight:toggle", { id: card.id })}
              title="Toggle spotlight"
              className={`text-xs transition-colors ${
                spotlight?.name === card.name
                  ? "text-gold"
                  : "text-text-muted hover:text-gold"
              }`}
            >
              ◉
            </button>
            <button
              onClick={() => emit("card:remove", { id: card.id })}
              title="Remove"
              className="text-xs text-text-muted hover:text-status-red transition-colors"
            >
              ×
            </button>
          </div>
        ))}
        {cards.length === 0 && (
          <span className="text-xs text-text-muted italic">No cards</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => emit("spotlight:off")}
          disabled={!spotlight}
          className="h-7 rounded bg-bg-surface px-3 text-xs text-text-dim hover:bg-bg-overlay disabled:opacity-40 transition-colors"
        >
          Spotlight Off
        </button>
        <button
          onClick={clearAll}
          disabled={cards.length === 0}
          className="h-7 rounded bg-bg-surface px-3 text-xs text-status-red hover:bg-status-red/10 disabled:opacity-40 transition-colors"
        >
          Clear All
        </button>
      </div>
    </div>
  );
}
