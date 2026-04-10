import { useEffect, useState } from "react";
import type { TopDeckConfig } from "@shared/types";

interface Props {
  open: boolean;
  onClose: () => void;
  topDeckConfig: TopDeckConfig | null;
  onTopDeckConfigChange: (config: TopDeckConfig | null) => void;
}

export function SettingsDialog({
  open,
  onClose,
  topDeckConfig,
  onTopDeckConfigChange,
}: Props) {
  const [apiKey, setApiKey] = useState(topDeckConfig?.apiKey ?? "");
  const [tid, setTid] = useState(topDeckConfig?.tournamentId ?? "");

  useEffect(() => {
    setApiKey(topDeckConfig?.apiKey ?? "");
    setTid(topDeckConfig?.tournamentId ?? "");
  }, [open, topDeckConfig]);

  if (!open) return null;

  const handleSave = () => {
    if (apiKey.trim() && tid.trim()) {
      const config: TopDeckConfig = {
        apiKey: apiKey.trim(),
        tournamentId: tid.trim(),
      };
      onTopDeckConfigChange(config);
      localStorage.setItem("topdeck-config", JSON.stringify(config));
    } else {
      onTopDeckConfigChange(null);
      localStorage.removeItem("topdeck-config");
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
          <div className="flex flex-col gap-2">
            <input
              type="password"
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-8 w-full rounded border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
            />
            <input
              type="text"
              placeholder="Tournament ID"
              value={tid}
              onChange={(e) => setTid(e.target.value)}
              className="h-8 w-full rounded border border-border bg-bg-surface px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none"
            />
          </div>
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

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-8 rounded bg-bg-surface px-4 text-sm text-text-dim hover:bg-bg-overlay transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="h-8 rounded bg-gold px-4 text-sm font-medium text-bg-base hover:bg-gold-hover transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
