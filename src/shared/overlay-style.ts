import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import type { OverlayStyleSettings } from "./types";

const CACHE_KEY = "overlay-style-settings";

export function readCachedOverlayStyleSettings(): OverlayStyleSettings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as OverlayStyleSettings) : null;
  } catch {
    return null;
  }
}

function writeCachedOverlayStyleSettings(settings: OverlayStyleSettings | null): void {
  try {
    if (settings) localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore quota / disabled storage
  }
}

export function useOverlayStyleSettings(
  socket: React.RefObject<Socket | null>,
  onUpdate?: (settings: OverlayStyleSettings | null) => void,
): void {
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: OverlayStyleSettings | null) => {
      writeCachedOverlayStyleSettings(data);
      cbRef.current?.(data);
    };
    s.on("overlayStyle:updated", handler);
    return () => { s.off("overlayStyle:updated", handler); };
  }, [socket]);
}
