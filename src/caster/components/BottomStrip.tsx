import { useCallback } from "react";
import type { OverlayCard, SpotlightData, FocusedCardData } from "@shared/types";
import { HugeiconsIcon } from "@hugeicons/react";
import { SpotlightIcon, LightbulbOffIcon, Image01Icon } from "@hugeicons/core-free-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";

interface Props {
  cards: OverlayCard[];
  spotlight: SpotlightData | null;
  focusedCard: FocusedCardData | null;
  emit: (event: string, data?: unknown) => void;
}

export function BottomStrip({ cards, spotlight, focusedCard, emit }: Props) {
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => emit("spotlight:toggle", { id: card.id })}
                  className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                    spotlight?.name === card.name
                      ? "text-gold hover:bg-gold/10"
                      : "text-text-muted hover:text-gold hover:bg-bg-overlay"
                  }`}
                >
                  <HugeiconsIcon icon={SpotlightIcon} size={18} color="currentColor" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>Toggle spotlight</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => emit("card:remove", { id: card.id })}
                  className="h-7 w-7 flex items-center justify-center rounded text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                >
                  <span className="text-base leading-none">×</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>Remove</TooltipContent>
            </Tooltip>
          </div>
        ))}
        {cards.length === 0 && (
          <span className="text-xs text-text-muted italic">Search or drag cards onto the canvas to add them</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        {focusedCard ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => emit("focusedCard:clear")}
                className="h-9 flex items-center gap-1.5 rounded bg-gold/20 border border-gold/40 px-2.5 text-gold hover:bg-gold/30 transition-colors"
              >
                <HugeiconsIcon icon={Image01Icon} size={16} color="currentColor" />
                <span className="text-xs max-w-[120px] truncate">{focusedCard.name}</span>
                <span className="text-base leading-none ml-0.5">&times;</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>Clear focused card</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                disabled
                className="h-9 w-9 flex items-center justify-center rounded bg-bg-surface text-text-dim disabled:opacity-40 transition-colors"
              >
                <HugeiconsIcon icon={Image01Icon} size={20} color="currentColor" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>No focused card</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => emit("spotlight:off")}
              disabled={!spotlight}
              className="h-9 w-9 flex items-center justify-center rounded bg-bg-surface text-text-dim hover:bg-bg-overlay disabled:opacity-40 transition-colors"
            >
              <HugeiconsIcon icon={LightbulbOffIcon} size={20} color="currentColor" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>Spotlight off</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={clearAll}
              disabled={cards.length === 0}
              className="h-9 rounded bg-bg-surface px-4 text-xs text-status-red hover:bg-status-red/10 disabled:opacity-40 transition-colors"
            >
              Clear All
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>Remove all cards from overlay</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
