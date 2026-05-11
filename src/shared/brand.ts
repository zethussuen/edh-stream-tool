import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { BrandSettings } from "./types";

const GF_LINK_ID = "brand-google-font";
const BRAND_CACHE_KEY = "brand-settings";

export function readCachedBrandSettings(): BrandSettings | null {
  try {
    const raw = localStorage.getItem(BRAND_CACHE_KEY);
    return raw ? (JSON.parse(raw) as BrandSettings) : null;
  } catch {
    return null;
  }
}

function writeCachedBrandSettings(settings: BrandSettings | null): void {
  try {
    if (settings) localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(settings));
    else localStorage.removeItem(BRAND_CACHE_KEY);
  } catch {
    // ignore quota / disabled storage
  }
}

export function applyBrandSettings(settings: BrandSettings | null): void {
  const root = document.documentElement;
  if (!settings) {
    root.style.removeProperty("--color-brand");
    root.style.removeProperty("--font-heading");
    document.getElementById(GF_LINK_ID)?.remove();
    return;
  }

  // Brand affects text color and heading font only. Backgrounds, borders, and
  // glows continue to use the static --color-gold defined in index.css.
  root.style.setProperty("--color-brand", settings.accentColor);
  root.style.setProperty("--font-heading", `"${settings.fontFamily}", sans-serif`);

  const href = `https://fonts.googleapis.com/css2?family=${settings.fontFamily.replace(/ /g, "+")}:wght@400;700&display=swap`;
  let el = document.getElementById(GF_LINK_ID) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.id = GF_LINK_ID;
    el.rel = "stylesheet";
    document.head.appendChild(el);
  }
  if (el.href !== href) el.href = href;
}

// Pre-apply cached brand at module load so overlays don't flash defaults on
// reload before the socket reports the current brand. The producer also writes
// to the same cache key, so all roles in the same origin share it.
if (typeof document !== "undefined") {
  const cached = readCachedBrandSettings();
  if (cached) applyBrandSettings(cached);
}

export function useBrandSettings(
  socket: React.RefObject<Socket | null>,
  onUpdate?: (settings: BrandSettings | null) => void,
): void {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: BrandSettings | null) => {
      applyBrandSettings(data);
      writeCachedBrandSettings(data);
      cbRef.current?.(data);
    };
    s.on("brand:updated", handler);
    return () => { s.off("brand:updated", handler); };
  }, [socket]);
}
