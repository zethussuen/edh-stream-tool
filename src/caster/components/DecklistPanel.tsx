import { useCallback, useState } from "react";
import type { ScryfallCard } from "@shared/types";
import * as scrollrack from "@shared/scrollrack";
import * as scryfall from "@shared/scryfall";
import { cardAddPayload, spotlightPayload, cardDragStart } from "@shared/cards";

interface Props {
  emit: (event: string, data?: unknown) => void;
}

interface DeckSection {
  name: string;
  cards: ScryfallCard[];
}

export function DecklistPanel({ emit }: Props) {
  const [rawText, setRawText] = useState("");
  const [sections, setSections] = useState<DeckSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });

  const loadDeck = useCallback(async () => {
    if (!rawText.trim()) return;
    setLoading(true);
    setError("");
    setSections([]);

    try {
      const validation = await scrollrack.validateDeck(rawText);

      if (validation.decklist) {
        // Use Scrollrack response with Scryfall IDs
        const allSections: DeckSection[] = [];
        const entries: { section: string; name: string; id: string }[] = [];

        for (const [sectionName, cards] of Object.entries(
          validation.decklist,
        )) {
          allSections.push({ name: sectionName, cards: [] });
          for (const [cardName, data] of Object.entries(cards)) {
            entries.push({
              section: sectionName,
              name: cardName,
              id: data.id,
            });
          }
        }

        setProgress({ loaded: 0, total: entries.length });

        for (let i = 0; i < entries.length; i++) {
          try {
            const card = await scryfall.getById(entries[i].id);
            const section = allSections.find(
              (s) => s.name === entries[i].section,
            );
            if (section) section.cards.push(card);
            setSections([...allSections]);
            setProgress({ loaded: i + 1, total: entries.length });
          } catch {
            // skip failed cards
          }
        }
      } else {
        // Fallback: parse raw text
        const parsed = scrollrack.parseRawDecklist(rawText);
        setProgress({ loaded: 0, total: parsed.length });

        const cards: ScryfallCard[] = [];
        await scrollrack.resolveCardNames(parsed, (card, idx) => {
          cards.push(card);
          setSections([{ name: "Deck", cards: [...cards] }]);
          setProgress({ loaded: idx + 1, total: parsed.length });
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load deck");

      // Fallback parse
      const parsed = scrollrack.parseRawDecklist(rawText);
      if (parsed.length > 0) {
        setProgress({ loaded: 0, total: parsed.length });
        const cards: ScryfallCard[] = [];
        await scrollrack.resolveCardNames(parsed, (card, idx) => {
          cards.push(card);
          setSections([{ name: "Deck", cards: [...cards] }]);
          setProgress({ loaded: idx + 1, total: parsed.length });
        });
      }
    } finally {
      setLoading(false);
    }
  }, [rawText]);

  const addCard = useCallback(
    (card: ScryfallCard) => emit("card:add", cardAddPayload(card)),
    [emit],
  );

  const spotlight = useCallback(
    (card: ScryfallCard) => emit("spotlight:show", spotlightPayload(card)),
    [emit],
  );

  const clearDeck = useCallback(() => {
    setSections([]);
    setRawText("");
    setError("");
    setProgress({ loaded: 0, total: 0 });
  }, []);

  return (
    <div className="flex flex-col gap-2 p-3">
      {sections.length === 0 ? (
        <>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={"~~Commanders~~\n1 Kraum, Ludevic's Opus\n1 Tymna the Weaver\n\n~~Mainboard~~\n1 Ad Nauseam\n..."}
            className="h-40 w-full resize-none rounded border border-border bg-bg-surface p-2 text-xs text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
          />
          <button
            onClick={loadDeck}
            disabled={loading || !rawText.trim()}
            className="h-8 rounded bg-gold px-4 text-sm font-medium text-bg-base hover:bg-gold-hover disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : "Load Deck"}
          </button>
        </>
      ) : (
        <button
          onClick={clearDeck}
          className="h-7 rounded bg-bg-surface px-3 text-xs text-text-dim hover:bg-bg-overlay transition-colors self-end"
        >
          Clear Deck
        </button>
      )}

      {loading && progress.total > 0 && (
        <p className="text-xs text-text-dim">
          Loading cards: {progress.loaded}/{progress.total}
        </p>
      )}

      {error && <p className="text-xs text-status-red">{error}</p>}

      {sections.map((section) => (
        <div key={section.name}>
          <div className="sticky top-0 z-10 bg-bg-raised py-1">
            <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
              {section.name} ({section.cards.length})
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {section.cards.map((card) => (
              <div
                key={card.scryfallId}
                draggable
                onDragStart={(e) => cardDragStart(e, card)}
                className="flex items-center gap-2 rounded p-1.5 hover:bg-bg-surface cursor-grab active:cursor-grabbing"
              >
                <img
                  src={card.imageUriSmall}
                  alt={card.name}
                  className="rounded"
                  style={{ width: 48, height: 67 }}
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">
                    {card.name}
                  </p>
                  <p className="text-xs text-text-dim truncate">
                    {card.typeLine}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => addCard(card)}
                    title="Add to overlay"
                    className="h-6 w-6 flex items-center justify-center rounded bg-bg-surface text-xs text-text-dim hover:bg-gold hover:text-bg-base transition-colors"
                  >
                    +
                  </button>
                  <button
                    onClick={() => spotlight(card)}
                    title="Spotlight"
                    className="h-6 w-6 flex items-center justify-center rounded bg-bg-surface text-xs text-text-dim hover:bg-gold hover:text-bg-base transition-colors"
                  >
                    ◉
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
