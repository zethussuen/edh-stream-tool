import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TopDeckConfig, BrandSettings, NameplateStyle, OverlayStyleSettings } from "@shared/types";
import { DEFAULT_BRAND, DEFAULT_NAMEPLATE_STYLE } from "@shared/constants";
import {
  DEFAULT_FEED_SETTINGS,
  FEED_BITRATE_LABELS,
  FEED_CODEC_LABELS,
  type FeedBitratePreset,
  type FeedCodecPreset,
  type FeedSettings,
} from "@shared/feed-settings";

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

// FontPicker dropdown is portaled to document.body so it isn't clipped by the
// dialog's scrollable content pane.
function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    searchRef.current?.focus();
    requestAnimationFrame(() => {
      selectedRef.current?.scrollIntoView({ block: "nearest" });
    });
  }, [open]);

  function toggle() {
    if (!open) {
      const r = buttonRef.current?.getBoundingClientRect();
      if (r) setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen((o) => !o);
  }

  const filtered = query
    ? FONT_OPTIONS.filter((f) => f.toLowerCase().includes(query.toLowerCase()))
    : FONT_OPTIONS;

  return (
    <div className="relative flex-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="h-8 w-full flex items-center justify-between gap-2 rounded border border-border bg-bg-surface px-3 text-sm text-text-primary hover:border-gold/60 focus:border-gold focus:outline-none"
      >
        <span className="truncate">{value || "Select font…"}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 3.5l3 3 3-3" />
        </svg>
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 10002,
          }}
          className="rounded border border-border bg-bg-raised shadow-xl"
        >
          <div className="p-1.5 border-b border-border">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
                if (e.key === "Enter" && filtered.length > 0) {
                  e.preventDefault();
                  onChange(filtered[0]);
                  setOpen(false);
                }
              }}
              placeholder="Type to filter…"
              className="h-7 w-full rounded border border-border bg-bg-surface px-2 text-xs text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-muted">No fonts match</div>
            ) : (
              filtered.map((f) => (
                <button
                  key={f}
                  ref={f === value ? selectedRef : undefined}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(f);
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
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Nameplate style picker ──

const NAMEPLATE_STYLE_OPTIONS: Array<{
  id: NameplateStyle;
  label: string;
  description: string;
}> = [
  { id: "classic", label: "Classic", description: "Current MTG-paper look — dark corner plate with rounded inner edge." },
  { id: "fighter", label: "Fighter", description: "Street Fighter / Tekken HUD — big italic seat number, slanted name, aggressive corner cut." },
  { id: "glass", label: "Glass", description: "Frosted glassmorphism floating off the corner. Low-key streamer vibe." },
  { id: "broadcast", label: "Broadcast", description: "TV-banner stripe with bold accent seat block. Formal sports broadcast." },
];

// Mini preview — a hand-rolled small rendition of each style. Designed to fit
// in a ~280×96 card so the 2×2 grid stays compact while still conveying the
// distinctive chrome of each style.
function StyleMiniPreview({ style }: { style: NameplateStyle }) {
  const frame: React.CSSProperties = {
    width: "100%",
    height: 96,
    position: "relative",
    overflow: "hidden",
    borderRadius: 4,
    background:
      "linear-gradient(135deg, #1d1d22 0%, #0b0b0e 100%)",
  };

  if (style === "classic") {
    return (
      <div style={frame}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            background: "rgba(0, 0, 0, 0.97)",
            padding: "6px 10px",
            borderRadius: "0 0 8px 0",
            minWidth: 84,
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 14, color: "#e4e0d8", lineHeight: 1 }}>
            Player
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "var(--color-brand)", marginTop: 2 }}>
            Najeela
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: "#8a8678", marginTop: 1 }}>
            <span style={{ color: "var(--color-brand)" }}>#1</span> · 3-0-0
          </div>
        </div>
      </div>
    );
  }

  if (style === "fighter") {
    return (
      <div style={frame}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            minWidth: 140,
            clipPath: `polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)`,
            filter: "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5))",
          }}
        >
          <div
            style={{
              width: 28,
              background:
                "linear-gradient(135deg, var(--color-brand) 0%, rgba(0,0,0,0.55) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-heading)",
              fontSize: 22,
              fontStyle: "italic",
              fontWeight: 900,
              lineHeight: 1,
              color: "#0a0a0c",
            }}
          >
            1
          </div>
          <div style={{ width: 2, background: "var(--color-brand)" }} />
          <div
            style={{
              background: "rgba(10, 10, 12, 0.95)",
              padding: "5px 10px",
              flex: 1,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 14,
                color: "#f3efe7",
                lineHeight: 1,
                letterSpacing: "1px",
                textTransform: "uppercase",
                fontStyle: "italic",
                fontWeight: 700,
              }}
            >
              Player
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7,
                color: "#bdb8ac",
                marginTop: 3,
              }}
            >
              Najeela
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 7,
                color: "var(--color-brand)",
                marginTop: 1,
                letterSpacing: "1px",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              #1 · 3-0-0
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (style === "glass") {
    return (
      <div style={frame}>
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            padding: "5px 12px",
            borderRadius: 8,
            background: "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            minWidth: 84,
          }}
        >
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 12, color: "#f3efe7", lineHeight: 1 }}>
            Player
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "rgba(244,240,232,0.78)", marginTop: 2 }}>
            Najeela
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: "rgba(244,240,232,0.55)", marginTop: 1 }}>
            <span style={{ color: "var(--color-brand)" }}>#1</span> · 3-0-0
          </div>
        </div>
      </div>
    );
  }

  // broadcast
  return (
    <div style={frame}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          minWidth: 130,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div
          style={{
            background: "rgba(8, 8, 10, 0.94)",
            padding: "5px 10px",
            flex: 1,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 13,
              color: "#f3efe7",
              lineHeight: 1,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Player
          </div>
          <div
            style={{
              marginTop: 3,
              paddingTop: 3,
              borderTop: "1px solid var(--color-brand)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 7,
              color: "#bdb8ac",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Najeela · <span style={{ color: "var(--color-brand)" }}>3-0-0</span>
          </div>
        </div>
        <div
          style={{
            width: 24,
            background: "var(--color-brand)",
            color: "#0a0a0c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-heading)",
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          1
        </div>
      </div>
    </div>
  );
}

// ── Sidebar nav ──

type SectionId = "tournament" | "branding" | "nameplates" | "feed" | "about";

interface SectionDef {
  id: SectionId;
  label: string;
  producerOnly?: boolean;
}

const SECTIONS: SectionDef[] = [
  { id: "tournament", label: "Tournament" },
  { id: "branding", label: "Branding", producerOnly: true },
  { id: "nameplates", label: "Nameplates", producerOnly: true },
  { id: "feed", label: "Video Feed", producerOnly: true },
  { id: "about", label: "About" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  topDeckConfig: TopDeckConfig | null;
  onTopDeckConfigChange: (config: TopDeckConfig | null) => void;
  hasServerKey: boolean;
  role?: "caster" | "control";
  // Producer-only customization. Casters can omit these props.
  brandSettings?: BrandSettings | null;
  onBrandSettingsChange?: (s: BrandSettings | null) => void;
  overlayStyleSettings?: OverlayStyleSettings | null;
  onOverlayStyleChange?: (s: OverlayStyleSettings | null) => void;
  feedSettings?: FeedSettings;
  onFeedSettingsChange?: (s: FeedSettings) => void;
  feedPublishing?: boolean;
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
  overlayStyleSettings,
  onOverlayStyleChange,
  feedSettings,
  onFeedSettingsChange,
  feedPublishing = false,
}: Props) {
  const isCaster = role === "caster";
  const visibleSections = SECTIONS.filter((s) => !s.producerOnly || !isCaster);
  const [activeSection, setActiveSection] = useState<SectionId>("tournament");

  const [apiKey, setApiKey] = useState(topDeckConfig?.apiKey ?? "");
  const [tid, setTid] = useState(topDeckConfig?.tournamentId ?? "");
  const [accentColor, setAccentColor] = useState(brandSettings?.accentColor ?? DEFAULT_BRAND.accentColor);
  const [fontFamily, setFontFamily] = useState(brandSettings?.fontFamily ?? DEFAULT_BRAND.fontFamily);
  const [nameplateStyle, setNameplateStyle] = useState<NameplateStyle>(
    overlayStyleSettings?.nameplateStyle ?? DEFAULT_NAMEPLATE_STYLE,
  );
  const [feedBitrate, setFeedBitrate] = useState<FeedBitratePreset>(
    feedSettings?.bitrate ?? DEFAULT_FEED_SETTINGS.bitrate,
  );
  const [feedCodec, setFeedCodec] = useState<FeedCodecPreset>(
    feedSettings?.codec ?? DEFAULT_FEED_SETTINGS.codec,
  );

  useEffect(() => {
    setApiKey(topDeckConfig?.apiKey ?? "");
    setTid(topDeckConfig?.tournamentId ?? "");
    setAccentColor(brandSettings?.accentColor ?? DEFAULT_BRAND.accentColor);
    setFontFamily(brandSettings?.fontFamily ?? DEFAULT_BRAND.fontFamily);
    setNameplateStyle(overlayStyleSettings?.nameplateStyle ?? DEFAULT_NAMEPLATE_STYLE);
    setFeedBitrate(feedSettings?.bitrate ?? DEFAULT_FEED_SETTINGS.bitrate);
    setFeedCodec(feedSettings?.codec ?? DEFAULT_FEED_SETTINGS.codec);
  }, [open, topDeckConfig, brandSettings, overlayStyleSettings, feedSettings]);

  // Lazy-load picked font so the live preview reflects the choice before save.
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
    if (!isCaster && onOverlayStyleChange) {
      onOverlayStyleChange({ nameplateStyle });
    }
    if (!isCaster && onFeedSettingsChange) {
      onFeedSettingsChange({ bitrate: feedBitrate, codec: feedCodec });
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
      <div
        className="flex flex-col rounded-lg border border-border bg-bg-raised shadow-xl"
        style={{
          width: 920,
          height: 620,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
        }}
      >
        {/* body: sidebar + content pane */}
        <div className="flex flex-1 min-h-0">
          {/* sidebar */}
          <aside className="w-[200px] shrink-0 border-r border-border bg-bg-base flex flex-col">
            <div className="px-4 py-4 border-b border-border">
              <h2 className="font-heading text-2xl text-brand leading-none">Settings</h2>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-text-muted">
                {isCaster ? "Caster" : "Producer"}
              </p>
            </div>
            <nav className="flex-1 p-2 flex flex-col gap-1">
              {visibleSections.map((sec) => {
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSection(sec.id)}
                    className={`relative h-9 rounded px-3 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-gold/10 text-brand"
                        : "text-text-dim hover:bg-bg-surface hover:text-text-primary"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-gold" />
                    )}
                    {sec.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* content pane */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {activeSection === "tournament" && (
              <section>
                <SectionHeader title="Tournament" subtitle="TopDeck.gg connection details for the active room." />
                {isCaster ? (
                  <div className="flex flex-col gap-2 max-w-md">
                    {topDeckConfig?.tournamentId ? (
                      <div className="flex items-center gap-2 h-9 px-3 rounded border border-border bg-bg-surface">
                        <span className="h-2 w-2 rounded-full bg-status-green shrink-0" />
                        <span className="text-xs text-text-dim">
                          Connected — set by producer
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 h-9 px-3 rounded border border-border bg-bg-surface">
                        <span className="h-2 w-2 rounded-full bg-text-muted shrink-0" />
                        <span className="text-xs text-text-muted">
                          Waiting for producer to set tournament
                        </span>
                      </div>
                    )}
                    {topDeckConfig?.tournamentId && (
                      <div className="text-[11px] text-text-muted">
                        Tournament ID: <span className="text-text-dim">{topDeckConfig.tournamentId}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-w-md">
                    <Field label="API Key">
                      {hasServerKey ? (
                        <div className="flex items-center gap-2 h-9 px-3 rounded border border-border bg-bg-surface">
                          <span className="h-2 w-2 rounded-full bg-status-green shrink-0" />
                          <span className="text-xs text-text-dim">Server API key configured</span>
                        </div>
                      ) : (
                        <input
                          type="password"
                          placeholder="API Key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="h-9 w-full rounded border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
                        />
                      )}
                    </Field>
                    <Field label="Tournament ID">
                      <input
                        type="text"
                        placeholder="From the tournament URL"
                        value={tid}
                        onChange={(e) => setTid(e.target.value)}
                        className="h-9 w-full rounded border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
                      />
                    </Field>
                    {!hasServerKey && (
                      <a
                        href="https://topdeck.gg/account"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-brand hover:text-brand-hover transition-colors"
                      >
                        Find your API key at topdeck.gg/account →
                      </a>
                    )}
                  </div>
                )}
              </section>
            )}

            {activeSection === "branding" && !isCaster && (
              <section>
                <SectionHeader
                  title="Branding"
                  subtitle="Heading font and accent color used across overlays — name plates, decklist headings, spotlight text."
                />
                <div className="flex flex-col gap-3 max-w-md">
                  <Field label="Accent color">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="#c8aa6e"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-9 flex-1 rounded border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
                      />
                      <label
                        className="h-9 w-9 rounded border border-border shrink-0 cursor-pointer overflow-hidden relative"
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
                  </Field>
                  <Field label="Heading font">
                    <FontPicker value={fontFamily} onChange={setFontFamily} />
                  </Field>

                  <div className="mt-2 rounded border border-border bg-bg-surface px-4 py-3">
                    <div className="text-[9px] uppercase tracking-widest text-text-muted mb-2">Preview</div>
                    <div
                      style={{
                        fontFamily: `"${fontFamily}", sans-serif`,
                        fontSize: 36,
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
                    type="button"
                    onClick={() => {
                      setAccentColor(DEFAULT_BRAND.accentColor);
                      setFontFamily(DEFAULT_BRAND.fontFamily);
                      onBrandSettingsChange?.(null);
                    }}
                    className="self-start text-[11px] text-text-muted hover:text-text-dim transition-colors mt-1"
                  >
                    Reset to defaults
                  </button>
                </div>
              </section>
            )}

            {activeSection === "nameplates" && !isCaster && (
              <section>
                <SectionHeader
                  title="Name plate style"
                  subtitle="Choose how player name plates render on the overlay. Applies to /overlay and /nameplates browser sources."
                />
                <div className="grid grid-cols-2 gap-3">
                  {NAMEPLATE_STYLE_OPTIONS.map((opt) => {
                    const selected = nameplateStyle === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setNameplateStyle(opt.id)}
                        className={`group relative flex flex-col rounded border text-left transition-colors p-2 ${
                          selected
                            ? "border-gold bg-gold/5"
                            : "border-border bg-bg-surface hover:border-gold/40"
                        }`}
                      >
                        <StyleMiniPreview style={opt.id} />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span
                            className={`font-heading text-lg ${
                              selected ? "text-brand" : "text-text-primary"
                            }`}
                          >
                            {opt.label}
                          </span>
                          {selected && (
                            <span className="text-[9px] uppercase tracking-widest text-brand">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-text-muted leading-snug mt-0.5">
                          {opt.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNameplateStyle(DEFAULT_NAMEPLATE_STYLE);
                    onOverlayStyleChange?.(null);
                  }}
                  className="text-[11px] text-text-muted hover:text-text-dim transition-colors mt-3"
                >
                  Reset to default ({DEFAULT_NAMEPLATE_STYLE})
                </button>
              </section>
            )}

            {activeSection === "feed" && !isCaster && (
              <section>
                <SectionHeader
                  title="Video feed"
                  subtitle="Controls the camera feed streamed from this machine to the casters. Higher bitrate looks sharper but uses more bandwidth. Drop it if a venue's wifi is saturated."
                />
                <div className="flex flex-col gap-3 max-w-md">
                  <Field label="Bitrate">
                    <select
                      value={feedBitrate}
                      onChange={(e) => setFeedBitrate(e.target.value as FeedBitratePreset)}
                      className="h-9 w-full rounded border border-border bg-bg-surface px-3 text-sm text-text-primary focus:border-gold focus:outline-none"
                    >
                      {(Object.keys(FEED_BITRATE_LABELS) as FeedBitratePreset[]).map((id) => (
                        <option key={id} value={id}>{FEED_BITRATE_LABELS[id]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Codec preference">
                    <select
                      value={feedCodec}
                      onChange={(e) => setFeedCodec(e.target.value as FeedCodecPreset)}
                      className="h-9 w-full rounded border border-border bg-bg-surface px-3 text-sm text-text-primary focus:border-gold focus:outline-none"
                    >
                      {(Object.keys(FEED_CODEC_LABELS) as FeedCodecPreset[]).map((id) => (
                        <option key={id} value={id}>{FEED_CODEC_LABELS[id]}</option>
                      ))}
                    </select>
                  </Field>

                  {feedPublishing && feedCodec !== (feedSettings?.codec ?? DEFAULT_FEED_SETTINGS.codec) && (
                    <div className="rounded border border-yellow-500/40 bg-yellow-500/5 px-3 py-2 text-[11px] text-yellow-200/90 leading-relaxed">
                      Codec changes apply to new caster connections. Restart Camera (or have casters reload) to switch the live feed.
                    </div>
                  )}

                  <p className="text-[10px] text-text-muted leading-relaxed mt-1">
                    Bitrate changes apply to the live feed immediately. Codec preference only affects new peer connections, so restart Camera or have casters reload to switch a live session.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setFeedBitrate(DEFAULT_FEED_SETTINGS.bitrate);
                      setFeedCodec(DEFAULT_FEED_SETTINGS.codec);
                      onFeedSettingsChange?.(DEFAULT_FEED_SETTINGS);
                    }}
                    className="self-start text-[11px] text-text-muted hover:text-text-dim transition-colors mt-1"
                  >
                    Reset to defaults
                  </button>
                </div>
              </section>
            )}

            {activeSection === "about" && (
              <section>
                <SectionHeader
                  title="About"
                  subtitle="cEDH Stream Tool is free and open source. Built for casting competitive EDH tournaments."
                />
                <div className="flex flex-col gap-4 max-w-md">
                  <div className="rounded border border-border bg-bg-surface px-4 py-3">
                    <div className="font-heading text-2xl text-brand leading-none">cEDH Stream Tool</div>
                    <a
                      href={`https://github.com/zethussuen/edh-stream-tool/releases/tag/v${__APP_VERSION__}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1.5 text-[11px] text-text-muted hover:text-brand transition-colors"
                    >
                      Version {__APP_VERSION__}
                    </a>
                  </div>

                  <div className="flex flex-col gap-2">
                    <a
                      href="https://github.com/zethussuen/edh-stream-tool"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-brand hover:text-brand-hover transition-colors"
                    >
                      Source code on GitHub →
                    </a>
                    <a
                      href="https://www.patreon.com/c/Eldrazidev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-brand hover:text-brand-hover transition-colors"
                    >
                      Support development on Patreon →
                    </a>
                  </div>

                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Patreon support directly funds new features, bug fixes, and continued maintenance.
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-border bg-bg-base px-6 py-3">
          <span className="text-[10px] text-text-muted">v{__APP_VERSION__}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded bg-bg-surface px-4 text-sm text-text-dim hover:bg-bg-overlay transition-colors"
            >
              {isCaster ? "Close" : "Cancel"}
            </button>
            {!isCaster && (
              <button
                type="button"
                onClick={handleSave}
                className="h-9 rounded bg-gold px-4 text-sm font-medium text-bg-base hover:bg-gold-hover transition-colors"
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h3 className="font-heading text-2xl text-text-primary leading-none">{title}</h3>
      {subtitle && (
        <p className="mt-2 text-[11px] text-text-muted leading-relaxed max-w-lg">{subtitle}</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
