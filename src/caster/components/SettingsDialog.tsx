import { useEffect, useRef, useState } from "react";
import type { TopDeckConfig, BrandSettings } from "@shared/types";
import { DEFAULT_BRAND } from "@shared/constants";

const FONT_OPTIONS = [
  "Anton",
  "Archivo Narrow",
  "Audiowide",
  "Bai Jamjuree",
  "Barlow",
  "Barlow Condensed",
  "Bebas Neue",
  "Black Han Sans",
  "Cairo",
  "Chakra Petch",
  "Changa",
  "Electrolize",
  "Encode Sans Condensed",
  "Exo 2",
  "Fjalla One",
  "Graduate",
  "Gugi",
  "Inter",
  "Jura",
  "Kanit",
  "Michroma",
  "Montserrat",
  "Nunito",
  "Open Sans",
  "Orbitron",
  "Oswald",
  "Oxanium",
  "Passion One",
  "Play",
  "Quantico",
  "Rajdhani",
  "Raleway",
  "Roboto Condensed",
  "Rubik",
  "Russo One",
  "Saira",
  "Saira Condensed",
  "Secular One",
  "Share Tech",
  "Squada One",
  "Syne",
  "Syncopate",
  "Teko",
  "Titillium Web",
  "Turret Road",
  "Urbanist",
];

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = FONT_OPTIONS.filter((f) =>
    f.toLowerCase().includes(query.toLowerCase()),
  ).slice(0, 24);

  return (
    <div ref={containerRef} className="relative flex-1">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); }
          if (e.key === "Enter" && filtered.length > 0) {
            onChange(filtered[0]);
            setQuery(filtered[0]);
            setOpen(false);
          }
        }}
        placeholder="Search fonts…"
        className="h-8 w-full rounded border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-[10001] top-full left-0 right-0 mt-1 max-h-52 overflow-y-auto rounded border border-border bg-bg-raised shadow-xl">
          {filtered.map((f) => (
            <button
              key={f}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(f);
                setQuery(f);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                f === value
                  ? "text-brand bg-gold/10"
                  : "text-text-primary hover:bg-bg-surface"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  topDeckConfig: TopDeckConfig | null;
  onTopDeckConfigChange: (config: TopDeckConfig | null) => void;
  hasServerKey: boolean;
  role?: "caster" | "control";
  // Brand controls are producer-only. Casters can omit these props.
  brandSettings?: BrandSettings | null;
  onBrandSettingsChange?: (s: BrandSettings | null) => void;
}

export function SettingsDialog({
  open,
  onClose,
  topDeckConfig,
  onTopDeckConfigChange,
  hasServerKey,
  role = "caster",
  brandSettings,
  onBrandSettingsChange,
}: Props) {
  const [apiKey, setApiKey] = useState(topDeckConfig?.apiKey ?? "");
  const [tid, setTid] = useState(topDeckConfig?.tournamentId ?? "");
  const [accentColor, setAccentColor] = useState(brandSettings?.accentColor ?? DEFAULT_BRAND.accentColor);
  const [fontFamily, setFontFamily] = useState(brandSettings?.fontFamily ?? DEFAULT_BRAND.fontFamily);
  const isCaster = role === "caster";

  useEffect(() => {
    setApiKey(topDeckConfig?.apiKey ?? "");
    setTid(topDeckConfig?.tournamentId ?? "");
    setAccentColor(brandSettings?.accentColor ?? DEFAULT_BRAND.accentColor);
    setFontFamily(brandSettings?.fontFamily ?? DEFAULT_BRAND.fontFamily);
  }, [open, topDeckConfig, brandSettings]);

  // Lazy-load the picked font so the preview block reflects the new face
  // before the producer hits Save. Links are cached by font so swapping is
  // cheap on subsequent selections.
  useEffect(() => {
    if (!open || isCaster || !fontFamily) return;
    const linkId = `font-preview-${fontFamily.replace(/\s+/g, "-")}`;
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }, [open, isCaster, fontFamily]);

  if (!open) return null;

  const handleSave = () => {
    const config: TopDeckConfig = {
      apiKey: apiKey.trim(),
      tournamentId: tid.trim(),
    };
    if (config.apiKey || config.tournamentId) {
      onTopDeckConfigChange(config);
    } else {
      onTopDeckConfigChange(null);
    }
    if (!isCaster && onBrandSettingsChange) {
      onBrandSettingsChange({
        accentColor: accentColor.trim() || DEFAULT_BRAND.accentColor,
        fontFamily: fontFamily || DEFAULT_BRAND.fontFamily,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[420px] rounded-lg border border-border bg-bg-raised p-6 shadow-xl">
        <h2 className="font-heading text-2xl text-brand mb-4">Settings</h2>

        {/* TopDeck.gg */}
        <fieldset className="mb-4">
          <legend className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-2">
            TopDeck.gg
          </legend>
          {isCaster ? (
            <div className="flex flex-col gap-2">
              {topDeckConfig?.tournamentId ? (
                <div className="flex items-center gap-2 h-8 px-3 rounded border border-border bg-bg-surface">
                  <span className="h-2 w-2 rounded-full bg-status-green shrink-0" />
                  <span className="text-xs text-text-dim">
                    Connected to tournament — set by producer
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 h-8 px-3 rounded border border-border bg-bg-surface">
                  <span className="h-2 w-2 rounded-full bg-text-muted shrink-0" />
                  <span className="text-xs text-text-muted">
                    Waiting for producer to set tournament
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {hasServerKey ? (
                <div className="flex items-center gap-2 h-8 px-3 rounded border border-border bg-bg-surface">
                  <span className="h-2 w-2 rounded-full bg-status-green shrink-0" />
                  <span className="text-xs text-text-dim">Server API key configured</span>
                </div>
              ) : (
                <input
                  type="password"
                  placeholder="API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="h-8 w-full rounded border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
                />
              )}
              <input
                type="text"
                placeholder="Tournament ID (from tournament URL)"
                value={tid}
                onChange={(e) => setTid(e.target.value)}
                className="h-8 w-full rounded border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
              />
              {!hasServerKey && (
                <a
                  href="https://topdeck.gg/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-[10px] text-brand hover:text-brand-hover transition-colors"
                >
                  Find your API key at topdeck.gg/account &rarr;
                </a>
              )}
            </div>
          )}
        </fieldset>

        {/* Video Feed info */}
        <fieldset className="mb-4">
          <legend className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-2">
            Live Video Feed
          </legend>
          <p className="text-[10px] text-text-muted leading-relaxed">
            The producer shares their OBS output via the "Start Camera" button on the
            producer panel. Casters receive the feed automatically — no configuration needed.
          </p>
        </fieldset>

        {/* Brand / Theme (producer only) */}
        {!isCaster && (
          <fieldset className="mb-6">
            <legend className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-2">
              Brand / Theme
            </legend>
            <p className="text-[10px] text-text-muted mb-2">
              Customises the heading font and the brand-colored text (overlay
              titles, name plates, decklist headings). Backgrounds, borders,
              and muted/gray text stay unchanged.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-dim w-24 shrink-0">Brand color</label>
                <input
                  type="text"
                  placeholder="#c8aa6e"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-8 flex-1 rounded border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
                />
                <label
                  className="h-8 w-8 rounded border border-border shrink-0 cursor-pointer overflow-hidden relative"
                  style={{ backgroundColor: accentColor }}
                  title="Pick a color"
                >
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : "#c8aa6e"}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-dim w-24 shrink-0">Heading font</label>
                <FontPicker value={fontFamily} onChange={setFontFamily} />
              </div>

              {/* Live preview — mirrors how the brand will look on overlays */}
              <div className="mt-1 rounded border border-border bg-bg-surface px-3 py-2">
                <div className="text-[9px] uppercase tracking-widest text-text-muted mb-1">Preview</div>
                <div
                  style={{
                    fontFamily: `"${fontFamily}", sans-serif`,
                    fontSize: 28,
                    lineHeight: 1,
                    letterSpacing: 1,
                    color: accentColor || DEFAULT_BRAND.accentColor,
                  }}
                >
                  Sample Heading
                </div>
                <div className="text-[10px] text-text-dim mt-1">Body text stays the same.</div>
              </div>

              <button
                onClick={() => {
                  setAccentColor(DEFAULT_BRAND.accentColor);
                  setFontFamily(DEFAULT_BRAND.fontFamily);
                  onBrandSettingsChange?.(null);
                }}
                className="self-start text-[10px] text-text-muted hover:text-text-dim transition-colors mt-1"
              >
                Reset to defaults
              </button>
            </div>
          </fieldset>
        )}

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-muted">v{__APP_VERSION__}</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-8 rounded bg-bg-surface px-4 text-sm text-text-dim hover:bg-bg-overlay transition-colors"
            >
              {isCaster ? "Close" : "Cancel"}
            </button>
            {!isCaster && (
              <button
                onClick={handleSave}
                className="h-8 rounded bg-gold px-4 text-sm font-medium text-bg-base hover:bg-gold-hover transition-colors"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
