/**
 * Renders a mana cost string like "{3}{G}{U}" as inline mana symbol SVGs.
 * SVGs are served from /mana_symbols/<symbol>.svg.
 */

interface Props {
  cost: string;
  size?: number;
  gap?: number;
}

const MANA_SYMBOL_RE = /\{([^}]+)\}/g;

/** Convert a mana symbol token to its SVG filename. e.g. "2/G" → "2G", "G" → "G" */
function symbolToFilename(symbol: string): string {
  return symbol.replace(/\//g, "");
}

export function ManaCost({ cost, size = 16, gap }: Props) {
  if (!cost) return null;

  // Use matchAll to avoid global regex lastIndex statefulness across re-renders
  const symbols = Array.from(cost.matchAll(MANA_SYMBOL_RE), (m) => m[1]);

  if (symbols.length === 0) return null;

  const spacing = gap ?? Math.round(size * 0.15);

  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {symbols.map((sym, i) => (
        <img
          key={i}
          src={`/mana_symbols/${symbolToFilename(sym)}.svg`}
          alt={`{${sym}}`}
          width={size}
          height={size}
          style={{
            display: "inline-block",
            marginLeft: i > 0 ? spacing : 0,
          }}
        />
      ))}
    </span>
  );
}
