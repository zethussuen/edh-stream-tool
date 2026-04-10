import { useCallback, useEffect, useRef, useState } from "react";
import type { TopDeckConfig } from "@shared/types";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { useRoom, useSocket } from "@shared/socket";
import { useFeedPublisher } from "@shared/feed";
import { Sidebar } from "../caster/components/Sidebar";
import { PreviewCanvas } from "../caster/components/PreviewCanvas";
import { CardLayer } from "../caster/components/CardLayer";
import { BottomStrip } from "../caster/components/BottomStrip";
import { SettingsDialog } from "../caster/components/SettingsDialog";

export function App() {
  const { socket, connected } = useSocket("control");
  const { state, emit } = useRoom(socket);
  const { publishing, deviceLabel, stream, startCapture, stopCapture } = useFeedPublisher(socket, connected);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Attach stream to preview video element
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.srcObject = stream.current;
    }
  }, [publishing, stream]);

  const [activeTab, setActiveTab] = useState("search");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [topDeckConfig, setTopDeckConfig] = useState<TopDeckConfig | null>(
    () => {
      try {
        const saved = localStorage.getItem("topdeck-config");
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    },
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setCanvasScale(Math.min(width / OVERLAY_WIDTH, height / OVERLAY_HEIGHT));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Keyboard shortcuts (simplified — no draw tools)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "Escape") emit("spotlight:off");
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [emit]);

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateRows: "48px 1fr 54px",
        gridTemplateColumns: "320px 1fr",
      }}
    >
      {/* Header */}
      <div className="col-span-2 flex items-center gap-3 border-b border-border bg-bg-raised px-4"
        style={{ height: 48 }}
      >
        <span className="font-heading text-xl tracking-wider text-gold mr-4">
          PRODUCER CONTROL
        </span>
        <div className="flex-1" />
        <button
          onClick={publishing ? stopCapture : startCapture}
          className={`h-8 rounded px-3 text-xs font-medium transition-colors ${
            publishing
              ? "bg-status-green/20 text-status-green hover:bg-status-red/20 hover:text-status-red"
              : "bg-bg-surface text-text-dim hover:bg-bg-overlay hover:text-text-primary"
          }`}
          title={publishing ? `Broadcasting: ${deviceLabel}. Click to stop.` : "Share camera feed with casters"}
        >
          {publishing ? `📹 ${deviceLabel}` : "📹 Start Camera"}
        </button>
        <button
          onClick={() => setSettingsOpen(true)}
          className="h-8 w-8 flex items-center justify-center rounded bg-bg-surface text-text-dim hover:bg-bg-overlay hover:text-text-primary transition-colors"
        >
          ⚙
        </button>
        <div
          title={connected ? "Connected" : "Disconnected"}
          className="h-3 w-3 rounded-full"
          style={{ background: connected ? "#27ae60" : "#c0392b" }}
        />
      </div>

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        emit={emit}
        topDeckConfig={topDeckConfig}
        searchInputRef={searchInputRef}
      />

      {/* Canvas (no draw layer) */}
      <div ref={canvasContainerRef} className="relative overflow-hidden bg-bg-base">
        <PreviewCanvas previewVideoRef={publishing ? previewRef : undefined}>
          <CardLayer
            cards={state.cards}
            scale={canvasScale}
            interactive={true}
            emit={emit}
          />
        </PreviewCanvas>
      </div>

      {/* Bottom Strip */}
      <div className="col-span-2">
        <BottomStrip
          cards={state.cards}
          spotlight={state.spotlight}
          emit={emit}
        />
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        topDeckConfig={topDeckConfig}
        onTopDeckConfigChange={setTopDeckConfig}
      />
    </div>
  );
}
