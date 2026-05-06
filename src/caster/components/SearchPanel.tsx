import { useCallback, useEffect, useRef, useState } from "react";
import * as scryfall from "@shared/scryfall";
import type { ScryfallCard } from "@shared/types";
import { cardAddPayload, spotlightPayload, focusedCardPayload, cardDragStart } from "@shared/cards";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignCircleIcon, SpotlightIcon, Image01Icon } from "@hugeicons/core-free-icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";
import { ManaCost } from "@shared/components/ManaCost";

interface Props {
  emit: (event: string, data?: unknown) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchPanel({ emit, searchInputRef }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cache = useRef(new Map<string, ScryfallCard[]>());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError("");
      return;
    }

    if (cache.current.has(q)) {
      setResults(cache.current.get(q)!);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const cards = await scryfall.search(q);
        cache.current.set(q, cards);
        setResults(cards);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const addCard = useCallback(
    (card: ScryfallCard) => emit("card:add", cardAddPayload(card)),
    [emit],
  );

  const spotlight = useCallback(
    (card: ScryfallCard) => emit("spotlight:show", spotlightPayload(card)),
    [emit],
  );

  const focusCard = useCallback(
    (card: ScryfallCard) => emit("focusedCard:set", focusedCardPayload(card)),
    [emit],
  );

  return (
    <div className="flex flex-col gap-2 p-3">
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search Scryfall (e.g. Thassa's Oracle)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-8 w-full rounded border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
      />

      {loading && (
        <p className="text-xs text-text-dim">Searching...</p>
      )}
      {error && (
        <p className="text-xs text-status-red">{error}</p>
      )}

      <div className="flex flex-col gap-1">
        {results.map((card) => (
          <div
            key={card.scryfallId}
            draggable
            onDragStart={(e) => cardDragStart(e, card)}
            className="flex items-center gap-2 rounded p-1.5 hover:bg-bg-surface cursor-grab active:cursor-grabbing"
            title="Drag onto canvas to place"
          >
            <img
              src={card.imageUriSmall}
              alt={card.name}
              className="rounded"
              style={{ width: 48, height: 67 }}
              loading="lazy"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm text-text-primary truncate">{card.name}</p>
                <ManaCost cost={card.manaCost} size={14} />
              </div>
              <p className="text-xs text-text-dim truncate">{card.typeLine}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => addCard(card)}
                    className="h-9 w-9 flex items-center justify-center rounded bg-bg-surface text-text-dim hover:bg-gold hover:text-bg-base transition-colors"
                  >
                    <HugeiconsIcon icon={PlusSignCircleIcon} size={20} color="currentColor" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={6}>Add to overlay</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => focusCard(card)}
                    className="h-9 w-9 flex items-center justify-center rounded bg-bg-surface text-text-dim hover:bg-gold hover:text-bg-base transition-colors"
                  >
                    <HugeiconsIcon icon={Image01Icon} size={20} color="currentColor" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={6}>Focus card</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => spotlight(card)}
                    className="h-9 w-9 flex items-center justify-center rounded bg-bg-surface text-text-dim hover:bg-gold hover:text-bg-base transition-colors"
                  >
                    <HugeiconsIcon icon={SpotlightIcon} size={20} color="currentColor" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" sideOffset={6}>Spotlight</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
