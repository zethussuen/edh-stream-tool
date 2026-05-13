import { useCallback, useEffect, useRef, useState } from "react";
import type { TopDeckConfig, TopDeckTable, NamePlate, FocusedCardData, StreamPlayerStats, BrandSettings, DecklistOverlayData, PodSummaryData } from "@shared/types";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { applyBrandSettings, readCachedBrandSettings, useBrandSettings } from "@shared/brand";
import { useRoom, useSocket, getRoom } from "@shared/socket";
import { useFeedPublisher } from "@shared/feed";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/components/ui/tooltip";
import { Sidebar } from "../caster/components/Sidebar";
import { PreviewCanvas } from "../caster/components/PreviewCanvas";
import { CardLayer } from "../caster/components/CardLayer";
import { BottomStrip } from "../caster/components/BottomStrip";
import { SettingsDialog } from "../caster/components/SettingsDialog";
import { ConnectionUrlsPopover } from "./components/ConnectionUrlsPopover";

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
  const [hasServerKey, setHasServerKey] = useState(false);
  const [streamTable, setStreamTableLocal] = useState<TopDeckTable | null>(null);
  const setStreamTable = useCallback((table: TopDeckTable | null, plates: NamePlate[] | null = null, round?: number | string, tournamentName?: string, stats?: StreamPlayerStats[] | null) => {
    setStreamTableLocal(table);
    emit("streamTable:set", table);
    emit("namePlates:set", plates);
    emit("streamRound:set", round != null && tournamentName != null ? { round, tournamentName } : null);
    emit("streamStats:set", stats ?? null);
  }, [emit]);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (table: TopDeckTable | null) => setStreamTableLocal(table);
    s.on("streamTable:updated", handler);
    return () => { s.off("streamTable:updated", handler); };
  }, [socket]);

  const [focusedCard, setFocusedCard] = useState<FocusedCardData | null>(null);
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: FocusedCardData | null) => setFocusedCard(data);
    s.on("focusedCard:updated", handler);
    return () => { s.off("focusedCard:updated", handler); };
  }, [socket]);

  const [activeDecklist, setActiveDecklist] = useState<DecklistOverlayData | null>(null);
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: DecklistOverlayData | null) => setActiveDecklist(data);
    s.on("decklist:updated", handler);
    return () => { s.off("decklist:updated", handler); };
  }, [socket]);

  const [podSummary, setPodSummary] = useState<PodSummaryData | null>(null);
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: PodSummaryData | null) => setPodSummary(data);
    s.on("podSummary:updated", handler);
    return () => { s.off("podSummary:updated", handler); };
  }, [socket]);
  const handleSetPodSummary = useCallback((data: PodSummaryData | null) => {
    setPodSummary(data);
    emit("podSummary:set", data);
  }, [emit]);
  const room = getRoom();
  const [topDeckConfig, setTopDeckConfigLocal] = useState<TopDeckConfig | null>(
    () => {
      try {
        const saved = localStorage.getItem("topdeck-config");
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        return { ...parsed, room };
      } catch {
        return null;
      }
    },
  );

  const setTopDeckConfig = useCallback((config: TopDeckConfig | null) => {
    if (config) {
      const withRoom = { ...config, room };
      setTopDeckConfigLocal(withRoom);
      localStorage.setItem("topdeck-config", JSON.stringify(config));
      // Share with all clients in the room (API key stays server-side)
      emit("topDeckConfig:set", { apiKey: config.apiKey, tournamentId: config.tournamentId });
    } else {
      setTopDeckConfigLocal(null);
      localStorage.removeItem("topdeck-config");
      emit("topDeckConfig:set", null);
    }
  }, [emit, room]);

  useEffect(() => {
    fetch(`/api/topdeck/has-key?room=${encodeURIComponent(room)}`)
      .then((r) => r.json())
      .then((d) => setHasServerKey(!!d.hasKey))
      .catch(() => {});
  }, [room]);

  // Keep a ref so the on-connect effect always reads the latest config
  const topDeckConfigRef = useRef(topDeckConfig);
  topDeckConfigRef.current = topDeckConfig;

  // On connect, push saved config to server so casters get it
  useEffect(() => {
    if (!connected) return;
    const saved = topDeckConfigRef.current;
    if (saved?.tournamentId) {
      emit("topDeckConfig:set", { apiKey: saved.apiKey, tournamentId: saved.tournamentId });
    }
  }, [connected, emit]);

  // ── Brand settings ──
  // brand.ts pre-applies the cached settings at module load (before React
  // mounts), so we only seed useState from the cache here for the settings
  // dialog defaults. The useBrandSettings hook keeps state and cache in sync
  // when the server echoes back brand:updated.
  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(
    () => readCachedBrandSettings(),
  );
  useBrandSettings(socket, setBrandSettings);

  const brandSettingsRef = useRef(brandSettings);
  brandSettingsRef.current = brandSettings;

  // Re-emit on connect so all clients get current brand
  useEffect(() => {
    if (!connected) return;
    if (brandSettingsRef.current) emit("brand:set", brandSettingsRef.current);
  }, [connected, emit]);

  const handleBrandSettingsChange = useCallback((settings: BrandSettings | null) => {
    // Apply locally now for instant feedback; the server echo will keep the
    // cache + other clients in sync.
    setBrandSettings(settings);
    applyBrandSettings(settings);
    emit("brand:set", settings);
  }, [emit]);

  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const listDevices = useCallback(async () => {
    // Request permission first so labels are populated
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach((t) => t.stop());
    } catch { /* user denied — we'll show empty list */ }
    const devices = await navigator.mediaDevices.enumerateDevices();
    setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!showDevicePicker) return;
    function onClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowDevicePicker(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showDevicePicker]);

  const handleCameraClick = useCallback(async () => {
    if (publishing) {
      stopCapture();
      return;
    }
    await listDevices();
    setShowDevicePicker(true);
  }, [publishing, stopCapture, listDevices]);

  const selectDevice = useCallback(async (deviceId: string) => {
    setShowDevicePicker(false);
    await startCapture(deviceId);
  }, [startCapture]);

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

      if (e.key === "Escape") {
        if (showDevicePicker) { setShowDevicePicker(false); return; }
        emit("spotlight:off");
      }
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [emit, showDevicePicker]);

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
        <span className="font-heading text-xl tracking-wider text-brand mr-4">
          PRODUCER CONTROL
        </span>
        <div className="flex-1" />
        <div className="relative" ref={pickerRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCameraClick}
                className={`h-8 rounded px-3 text-xs font-medium transition-colors ${
                  publishing
                    ? "bg-status-green/20 text-status-green hover:bg-status-red/20 hover:text-status-red"
                    : "bg-bg-surface text-text-dim hover:bg-bg-overlay hover:text-text-primary"
                }`}
              >
                {publishing ? `Stop (${deviceLabel})` : "Start Camera"}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {publishing ? "Stop broadcasting to casters" : "Share camera feed with casters"}
            </TooltipContent>
          </Tooltip>

          {showDevicePicker && (
            <div className="absolute right-0 top-full mt-1 z-50 min-w-[240px] rounded border border-border bg-bg-raised shadow-lg py-1">
              {videoDevices.length === 0 ? (
                <p className="px-3 py-2 text-xs text-text-muted">No cameras found</p>
              ) : (
                videoDevices.map((d) => (
                  <button
                    key={d.deviceId}
                    onClick={() => selectDevice(d.deviceId)}
                    className="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-bg-surface transition-colors truncate"
                  >
                    {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <ConnectionUrlsPopover />
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
        hasServerKey={hasServerKey}
        streamTable={streamTable}
        setStreamTable={setStreamTable}
        searchInputRef={searchInputRef}
        activeDecklist={activeDecklist}
        podSummaryActive={podSummary != null}
        onSetPodSummary={handleSetPodSummary}
      />

      {/* Canvas (no draw layer) */}
      <div ref={canvasContainerRef} className="relative overflow-hidden bg-bg-base">
        <PreviewCanvas previewVideoRef={publishing ? previewRef : undefined} emit={emit} isEmpty={state.cards.length === 0}>
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
          focusedCard={focusedCard}
          emit={emit}
        />
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        topDeckConfig={topDeckConfig}
        onTopDeckConfigChange={setTopDeckConfig}
        hasServerKey={hasServerKey}
        role="control"
        brandSettings={brandSettings}
        onBrandSettingsChange={handleBrandSettingsChange}
      />
    </div>
  );
}
