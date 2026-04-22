import { useEffect, useState } from "react";
import type { TopDeckConfig } from "@shared/types";

interface Props {
  open: boolean;
  onClose: () => void;
  topDeckConfig: TopDeckConfig | null;
  onTopDeckConfigChange: (config: TopDeckConfig | null) => void;
  hasServerKey: boolean;
  role?: "caster" | "control";
}

export function SettingsDialog({
  open,
  onClose,
  topDeckConfig,
  onTopDeckConfigChange,
  hasServerKey,
  role = "caster",
}: Props) {
  const [apiKey, setApiKey] = useState(topDeckConfig?.apiKey ?? "");
  const [tid, setTid] = useState(topDeckConfig?.tournamentId ?? "");
  const isCaster = role === "caster";

  useEffect(() => {
    setApiKey(topDeckConfig?.apiKey ?? "");
    setTid(topDeckConfig?.tournamentId ?? "");
  }, [open, topDeckConfig]);

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
        <h2 className="font-heading text-2xl text-gold mb-4">Settings</h2>

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
                  className="mt-1.5 inline-block text-[10px] text-gold hover:text-gold-hover transition-colors"
                >
                  Find your API key at topdeck.gg/account &rarr;
                </a>
              )}
            </div>
          )}
        </fieldset>

        {/* Video Feed info */}
        <fieldset className="mb-6">
          <legend className="text-[10px] font-medium uppercase tracking-widest text-text-muted mb-2">
            Live Video Feed
          </legend>
          <p className="text-[10px] text-text-muted leading-relaxed">
            The producer shares their OBS output via the "Start Camera" button on the
            producer panel. Casters receive the feed automatically — no configuration needed.
          </p>
        </fieldset>

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
