import { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";

interface ConnectionInfo {
  lanIp: string;
  port: number;
}

interface UrlEntry {
  label: string;
  url: string;
}

function buildUrls(info: ConnectionInfo): UrlEntry[] {
  const lan = `http://${info.lanIp}:${info.port}`;
  return [
    { label: "Casters", url: `${lan}/caster/` },
    { label: "All Overlays", url: `${lan}/overlay/` },
    { label: "Spotlight", url: `${lan}/spotlight/` },
    { label: "Player Names", url: `${lan}/nameplates/` },
    { label: "Cards + Drawings", url: `${lan}/annotations/` },
    { label: "Decklist", url: `${lan}/decklist/` },
    { label: "Pod Summary", url: `${lan}/pod-summary/` },
    { label: "Focused Card", url: `${lan}/focused-card/` },
  ];
}

export function ConnectionUrlsPopover() {
  const [info, setInfo] = useState<ConnectionInfo | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/connection-info")
      .then((r) => r.json())
      .then((d: ConnectionInfo) => setInfo(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const copy = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied((c) => (c === url ? null : c)), 1200);
    } catch {
      // ignore
    }
  }, []);

  const urls = info ? buildUrls(info) : [];
  const lanReachable = info?.lanIp && info.lanIp !== "localhost";

  return (
    <div className="relative" ref={containerRef}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen((v) => !v)}
            className="h-8 rounded px-3 text-xs font-medium bg-bg-surface text-text-dim hover:bg-bg-overlay hover:text-text-primary transition-colors"
          >
            URLs
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          Connection URLs for casters and OBS
        </TooltipContent>
      </Tooltip>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-[420px] rounded border border-border bg-bg-raised shadow-lg p-2">
          {!info ? (
            <p className="px-2 py-2 text-xs text-text-muted">Loading…</p>
          ) : (
            <>
              {!lanReachable && (
                <p className="px-2 pb-2 text-[10px] uppercase tracking-wider text-status-red">
                  No LAN address detected — casters on other machines won&apos;t reach this server.
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {urls.map((entry) => (
                  <li key={entry.label} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-surface">
                    <span className="text-[10px] uppercase tracking-wider text-text-dim w-28 shrink-0">
                      {entry.label}
                    </span>
                    <span className="flex-1 truncate font-mono text-xs text-text-primary select-all">
                      {entry.url}
                    </span>
                    <button
                      onClick={() => copy(entry.url)}
                      className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-bg-surface text-text-dim hover:bg-brand/20 hover:text-brand transition-colors"
                    >
                      {copied === entry.url ? "Copied" : "Copy"}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
