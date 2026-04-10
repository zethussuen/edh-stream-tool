import type { DrawTool } from "@shared/types";
import { DRAW_COLORS, DRAW_WIDTHS } from "@shared/constants";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cursor01Icon, PencilEdit01Icon, ArrowDiagonalIcon, CircleIcon } from "@hugeicons/core-free-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";

interface Props {
  tool: DrawTool;
  setTool: (tool: DrawTool) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  onUndo: () => void;
  onClearDrawings: () => void;
  onClearCards: () => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
  connected: boolean;
}

const COLOR_NAMES: Record<string, string> = {
  "#ef4444": "Red",
  "#eab308": "Yellow",
  "#3b82f6": "Blue",
  "#22c55e": "Green",
  "#e4e0d8": "White",
};

const TOOLS: { key: DrawTool; icon: typeof Cursor01Icon; label: string; shortcut: string }[] = [
  { key: "select", icon: Cursor01Icon, label: "Select", shortcut: "V" },
  { key: "pen", icon: PencilEdit01Icon, label: "Pen", shortcut: "P" },
  { key: "arrow", icon: ArrowDiagonalIcon, label: "Arrow", shortcut: "A" },
  { key: "circle", icon: CircleIcon, label: "Circle", shortcut: "C" },
];

export function Toolbar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  onUndo,
  onClearDrawings,
  onClearCards,
  onClearAll,
  onOpenSettings,
  connected,
}: Props) {
  return (
    <div className="flex items-center gap-3 border-b border-border bg-bg-raised px-4"
      style={{ height: 48 }}
    >
      {/* Brand */}
      <span className="font-heading text-xl tracking-wider text-gold mr-4">
        cEDH STREAM TOOL
      </span>

      {/* Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Tool buttons */}
      <div className="flex gap-1 ml-2">
        {TOOLS.map((t) => (
          <Tooltip key={t.key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTool(t.key)}
                className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
                  tool === t.key
                    ? "bg-gold text-bg-base"
                    : "bg-bg-surface text-text-dim hover:bg-bg-overlay hover:text-text-primary"
                }`}
              >
                <HugeiconsIcon icon={t.icon} size={16} color="currentColor" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {t.label} <kbd className="ml-1 rounded bg-background/20 px-1 py-0.5 text-[10px] font-mono">{t.shortcut}</kbd>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Color swatches */}
      <div className="flex gap-1 ml-1">
        {DRAW_COLORS.map((c) => (
          <Tooltip key={c}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setColor(c)}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "#c8aa6e" : "transparent",
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {COLOR_NAMES[c] ?? c}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Stroke widths */}
      <div className="flex items-center gap-1 ml-1">
        {DRAW_WIDTHS.map((w) => (
          <Tooltip key={w}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setStrokeWidth(w)}
                className={`flex h-8 items-center justify-center rounded px-2 text-xs transition-colors ${
                  strokeWidth === w
                    ? "bg-gold text-bg-base"
                    : "bg-bg-surface text-text-dim hover:bg-bg-overlay"
                }`}
              >
                {w}px
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {w === 4 ? "Thin" : w === 8 ? "Medium" : "Thick"} stroke
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Undo / Clear */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onUndo}
            className="h-8 rounded bg-bg-surface px-3 text-xs text-text-dim hover:bg-bg-overlay hover:text-text-primary transition-colors"
          >
            Undo
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Undo last drawing <kbd className="ml-1 rounded bg-background/20 px-1 py-0.5 text-[10px] font-mono">Ctrl+Z</kbd>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClearDrawings}
            className="h-8 rounded bg-bg-surface px-3 text-xs text-text-dim hover:bg-bg-overlay hover:text-text-primary transition-colors"
          >
            Clear drawings
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Clear all drawings <kbd className="ml-1 rounded bg-background/20 px-1 py-0.5 text-[10px] font-mono">X</kbd>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClearCards}
            className="h-8 rounded bg-bg-surface px-3 text-xs text-text-dim hover:bg-bg-overlay hover:text-text-primary transition-colors"
          >
            Clear cards
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Remove all cards from overlay
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClearAll}
            className="h-8 rounded bg-bg-surface px-3 text-xs text-status-red hover:bg-status-red/10 transition-colors"
          >
            Clear all
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Clear everything (drawings + cards)
        </TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Settings */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onOpenSettings}
            className="h-8 w-8 flex items-center justify-center rounded bg-bg-surface text-text-dim hover:bg-bg-overlay hover:text-text-primary transition-colors"
          >
            ⚙
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Settings
        </TooltipContent>
      </Tooltip>

      {/* Connection status */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: connected ? "#27ae60" : "#c0392b" }}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {connected ? "Connected" : "Disconnected"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
