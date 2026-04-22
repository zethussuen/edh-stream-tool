import type { ScryfallCard } from "./types";

/**
 * Client-side Scryfall-syntax card filter.
 *
 * Supported syntax:
 *   t:instant          — type line contains "instant"
 *   o:draw             — oracle text contains "draw"
 *   c:u / c:blue       — color includes blue
 *   ci:wub             — color identity includes W, U, B
 *   mv<=2 / cmc>3      — mana value comparison (=, <, >, <=, >=)
 *   pow>=3 / power=4   — power comparison
 *   tou<=2             — toughness comparison
 *   r:mythic           — rarity (common, uncommon, rare, mythic)
 *   kw:flying          — keyword contains
 *   s:neo / set:neo    — set name contains
 *   Plain text         — name contains (case-insensitive)
 *   -t:instant         — negation (NOT instant)
 *   (c:u or c:g)       — grouped OR clause
 *   t:creature mv<=3   — multiple terms are AND-joined by default
 *   "exact name"       — quoted literal name match
 */

// ── AST types ──

export type Expr =
  | { type: "atom"; value: string }
  | { type: "not"; child: Expr }
  | { type: "and"; children: Expr[] }
  | { type: "or"; children: Expr[] };

// ── Tokenizer ──

type Token =
  | { kind: "word"; value: string }
  | { kind: "quoted"; value: string }
  | { kind: "lparen" }
  | { kind: "rparen" }
  | { kind: "or" };

function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < query.length) {
    if (query[i] === " ") { i++; continue; }

    if (query[i] === "(") { tokens.push({ kind: "lparen" }); i++; continue; }
    if (query[i] === ")") { tokens.push({ kind: "rparen" }); i++; continue; }

    if (query[i] === '"') {
      const end = query.indexOf('"', i + 1);
      if (end !== -1) {
        tokens.push({ kind: "quoted", value: query.slice(i + 1, end) });
        i = end + 1;
      } else {
        tokens.push({ kind: "quoted", value: query.slice(i + 1) });
        break;
      }
      continue;
    }

    // Read a word — but handle key:"quoted value" syntax
    let end = i;
    while (end < query.length && query[end] !== " " && query[end] !== "(" && query[end] !== ")") {
      // If we hit a quote mid-word (e.g. o:"draw a card"), read until closing quote
      if (query[end] === '"') {
        const closeQuote = query.indexOf('"', end + 1);
        end = closeQuote !== -1 ? closeQuote + 1 : query.length;
        break;
      }
      end++;
    }
    const word = query.slice(i, end);
    if (word.toLowerCase() === "or") {
      tokens.push({ kind: "or" });
    } else {
      tokens.push({ kind: "word", value: word });
    }
    i = end;
  }
  return tokens;
}

// ── Parser (recursive descent) ──
// Grammar:
//   expr     = or_expr
//   or_expr  = and_expr ("or" and_expr)*
//   and_expr = unary+
//   unary    = "-" unary | primary
//   primary  = "(" expr ")" | atom

function parse(query: string): Expr {
  const tokens = tokenize(query.trim());
  if (tokens.length === 0) return { type: "and", children: [] };
  let pos = 0;

  function peek(): Token | undefined { return tokens[pos]; }
  function advance(): Token { return tokens[pos++]; }

  function parseOr(): Expr {
    const children: Expr[] = [parseAnd()];
    while (peek()?.kind === "or") {
      advance(); // consume "or"
      children.push(parseAnd());
    }
    return children.length === 1 ? children[0] : { type: "or", children };
  }

  function parseAnd(): Expr {
    const children: Expr[] = [];
    while (pos < tokens.length) {
      const t = peek();
      if (!t || t.kind === "rparen" || t.kind === "or") break;
      children.push(parseUnary());
    }
    return children.length === 1 ? children[0] : { type: "and", children };
  }

  function parseUnary(): Expr {
    const t = peek();
    if (t?.kind === "word" && t.value.startsWith("-") && t.value.length > 1) {
      advance();
      return { type: "not", child: { type: "atom", value: t.value.slice(1) } };
    }
    return parsePrimary();
  }

  function parsePrimary(): Expr {
    const t = peek();
    if (t?.kind === "lparen") {
      advance(); // consume "("
      const expr = parseOr();
      if (peek()?.kind === "rparen") advance(); // consume ")"
      return expr;
    }
    if (t?.kind === "quoted") {
      advance();
      return { type: "atom", value: t.value };
    }
    if (t?.kind === "word") {
      advance();
      return { type: "atom", value: t.value };
    }
    // Fallback — shouldn't happen
    advance();
    return { type: "and", children: [] };
  }

  const result = parseOr();
  return result;
}

// ── Evaluator ──

/** Parse a query string into an AST. Call once per query, then pass to matchesFilter per card. */
export function parseQuery(query: string): Expr {
  return parse(query);
}

/** Evaluate a pre-parsed AST against a card. */
export function matchesFilter(card: ScryfallCard, ast: Expr): boolean {
  return evaluate(card, ast);
}

function evaluate(card: ScryfallCard, expr: Expr): boolean {
  switch (expr.type) {
    case "atom":
      return matchAtom(card, expr.value);
    case "not":
      return !evaluate(card, expr.child);
    case "and":
      return expr.children.every((c) => evaluate(card, c));
    case "or":
      return expr.children.some((c) => evaluate(card, c));
  }
}

// ── Atom matching (single filter term) ──

const COLOR_MAP: Record<string, string> = {
  w: "W", white: "W",
  u: "U", blue: "U",
  b: "B", black: "B",
  r: "R", red: "R",
  g: "G", green: "G",
};

function parseColors(value: string): string[] {
  const mapped = COLOR_MAP[value.toLowerCase()];
  if (mapped) return [mapped];
  return value.toLowerCase().split("").map((c) => COLOR_MAP[c]).filter(Boolean) as string[];
}

const RARITY_MAP: Record<string, string> = {
  c: "common", common: "common",
  u: "uncommon", uncommon: "uncommon",
  r: "rare", rare: "rare",
  m: "mythic", mythic: "mythic",
};

function compareNum(actual: number, op: string, target: number): boolean {
  switch (op) {
    case "=": case ":": return actual === target;
    case "<": return actual < target;
    case ">": return actual > target;
    case "<=": return actual <= target;
    case ">=": return actual >= target;
    default: return false;
  }
}

function stripQuotes(s: string): string {
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') return s.slice(1, -1);
  return s;
}

function matchAtom(card: ScryfallCard, token: string): boolean {
  const keyMatch = token.match(/^([a-z]+)([:=<>!]+|[<>]=?)(.+)$/i);
  if (keyMatch) {
    const [, key, op, rawValue] = keyMatch;
    const value = stripQuotes(rawValue);
    const k = key.toLowerCase();
    const v = value.toLowerCase();

    switch (k) {
      case "t":
      case "type":
        return card.typeLine.toLowerCase().includes(v);

      case "o":
      case "oracle":
        return card.oracleText.toLowerCase().includes(v);

      case "c":
      case "color":
      case "colors": {
        const wanted = parseColors(value);
        return wanted.every((c) => card.colors.includes(c));
      }

      case "ci":
      case "id":
      case "identity": {
        const wanted = parseColors(value);
        return wanted.every((c) => card.colorIdentity.includes(c));
      }

      case "mv":
      case "cmc":
      case "manavalue": {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        return compareNum(card.cmc, op, num);
      }

      case "pow":
      case "power": {
        if (card.power == null) return false;
        const num = parseFloat(value);
        const actual = parseFloat(card.power);
        if (isNaN(num) || isNaN(actual)) return false;
        return compareNum(actual, op, num);
      }

      case "tou":
      case "toughness": {
        if (card.toughness == null) return false;
        const num = parseFloat(value);
        const actual = parseFloat(card.toughness);
        if (isNaN(num) || isNaN(actual)) return false;
        return compareNum(actual, op, num);
      }

      case "r":
      case "rarity": {
        const target = RARITY_MAP[v] ?? v;
        return card.rarity === target;
      }

      case "kw":
      case "keyword":
        return card.keywords.some((kw) => kw.toLowerCase().includes(v));

      case "s":
      case "set":
        return card.setName.toLowerCase().includes(v);

      case "a":
      case "artist":
        return card.artist.toLowerCase().includes(v);

      default:
        return card.name.toLowerCase().includes(token.toLowerCase());
    }
  }

  return card.name.toLowerCase().includes(token.toLowerCase());
}
