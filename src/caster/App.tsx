import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawTool, TopDeckConfig, TopDeckTable, NamePlate, FocusedCardData, StreamPlayerStats, DecklistOverlayData, PodSummaryData, PlayerSpotlightData } from "@shared/types";
import { DRAW_COLORS, DRAW_WIDTHS, OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { useBrandSettings } from "@shared/brand";
import { useRoom, useSocket, getRoom } from "@shared/socket";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { CardLayer } from "./components/CardLayer";
import { DrawLayer, type DrawLayerHandle } from "./components/DrawLayer";
import { BottomStrip } from "./components/BottomStrip";
import { SettingsDialog } from "./components/SettingsDialog";

export function App() {
  const { socket, connected } = useSocket("caster");
  const { state, emit } = useRoom(socket);

  useBrandSettings(socket);

  // Drawing state
  const [drawTool, setDrawTool] = useState<DrawTool>("select");
  const [drawColor, setDrawColor] = useState<string>(DRAW_COLORS[0]);
  const [drawWidth, setDrawWidth] = useState<number>(DRAW_WIDTHS[1]);
  // Sidebar
  const [activeTab, setActiveTab] = useState("search");
  const [streamTable, setStreamTableLocal] = useState<TopDeckTable | null>(null);
  const setStreamTable = useCallback((table: TopDeckTable | null, plates: NamePlate[] | null = null, round?: number | string, tournamentName?: string, stats?: StreamPlayerStats[] | null) => {
    setStreamTableLocal(table);
    emit("streamTable:set", table);
    emit("namePlates:set", plates);
    emit("streamRound:set", round != null && tournamentName != null ? { round, tournamentName } : null);
    emit("streamStats:set", stats ?? null);
  }, [emit]);

  // Focused card state
  const [focusedCard, setFocusedCard] = useState<FocusedCardData | null>(null);
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: FocusedCardData | null) => setFocusedCard(data);
    s.on("focusedCard:updated", handler);
    return () => { s.off("focusedCard:updated", handler); };
  }, [socket]);

  // Active decklist on overlay
  const [activeDecklist, setActiveDecklist] = useState<DecklistOverlayData | null>(null);
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: DecklistOverlayData | null) => setActiveDecklist(data);
    s.on("decklist:updated", handler);
    return () => { s.off("decklist:updated", handler); };
  }, [socket]);

  // Active pod summary on overlay
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

  // Active player spotlight on overlay
  const [playerSpotlight, setPlayerSpotlight] = useState<PlayerSpotlightData | null>(null);
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: PlayerSpotlightData | null) => setPlayerSpotlight(data);
    s.on("playerSpotlight:updated", handler);
    return () => { s.off("playerSpotlight:updated", handler); };
  }, [socket]);
  const handleSetPlayerSpotlight = useCallback((data: PlayerSpotlightData | null) => {
    setPlayerSpotlight(data);
    emit("playerSpotlight:set", data);
  }, [emit]);

  // Receive stream table changes from other clients
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (table: TopDeckTable | null) => setStreamTableLocal(table);
    s.on("streamTable:updated", handler);
    return () => { s.off("streamTable:updated", handler); };
  }, [socket]);

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const room = getRoom();
  const [hasServerKey, setHasServerKey] = useState(false);
  const [topDeckConfig, setTopDeckConfig] = useState<TopDeckConfig | null>(null);

  // Receive TopDeck config from producer via server
  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: { tournamentId: string } | null) => {
      if (data) {
        setTopDeckConfig({ apiKey: "", tournamentId: data.tournamentId, room });
        setHasServerKey(true);
      } else {
        setTopDeckConfig(null);
        setHasServerKey(false);
      }
    };
    s.on("topDeckConfig:updated", handler);
    return () => { s.off("topDeckConfig:updated", handler); };
  }, [socket, room]);

  // On mount, check if server already has config (for reconnects / late joins)
  useEffect(() => {
    fetch(`/api/topdeck/has-key?room=${encodeURIComponent(room)}`)
      .then((r) => r.json())
      .then((d) => setHasServerKey(!!d.hasKey))
      .catch(() => {});
  }, [room]);

  // Refs
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const drawLayerRef = useRef<DrawLayerHandle>(null);
  const [canvasScale, setCanvasScale] = useState(1);

  // Canvas scale tracking
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const sx = width / OVERLAY_WIDTH;
      const sy = height / OVERLAY_HEIGHT;
      setCanvasScale(Math.min(sx, sy));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Drawing undo/clear
  const handleUndo = useCallback(() => {
    drawLayerRef.current?.undo();
  }, []);

  const handleClearDrawings = useCallback(() => {
    drawLayerRef.current?.clear();
  }, []);

  const handleClearCards = useCallback(() => {
    if (window.confirm("Clear all cards from overlay?")) {
      emit("cards:clearAll");
    }
  }, [emit]);

  const handleClearAll = useCallback(() => {
    if (window.confirm("Clear everything (drawings + cards)?")) {
      drawLayerRef.current?.clear();
      emit("cards:clearAll");
    }
  }, [emit]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "v":
          setDrawTool("select");
          break;
        case "p":
          setDrawTool("pen");
          break;
        case "a":
          setDrawTool("arrow");
          break;
        case "c":
          setDrawTool("circle");
          break;
        case "x":
          handleClearDrawings();
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleUndo();
          }
          break;
        case "escape":
          emit("spotlight:off");
          break;
        case "/":
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClearDrawings, handleUndo, emit]);

  const isDrawing = drawTool !== "select";

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{
        gridTemplateRows: "48px 1fr 54px",
        gridTemplateColumns: "320px 1fr",
      }}
    >
      {/* Toolbar */}
      <div className="col-span-2">
        <Toolbar
          tool={drawTool}
          setTool={setDrawTool}
          color={drawColor}
          setColor={setDrawColor}
          strokeWidth={drawWidth}
          setStrokeWidth={setDrawWidth}
          onUndo={handleUndo}
          onClearDrawings={handleClearDrawings}
          onClearSpotlight={() => emit("spotlight:off")}
          spotlightActive={state.spotlight != null}
          onClearCards={handleClearCards}
          onClearPodSpotlight={() => handleSetPodSummary(null)}
          podSpotlightActive={podSummary != null}
          onClearPlayerSpotlight={() => handleSetPlayerSpotlight(null)}
          playerSpotlightActive={playerSpotlight != null}
          onClearAll={handleClearAll}
          onOpenSettings={() => setSettingsOpen(true)}
          connected={connected}
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
        playerSpotlightUid={playerSpotlight?.uid ?? null}
        onSetPlayerSpotlight={handleSetPlayerSpotlight}
      />

      {/* Preview Canvas */}
      <div ref={canvasContainerRef} className="relative overflow-hidden bg-bg-base">
        <PreviewCanvas socket={socket} connected={connected} emit={emit} isEmpty={state.cards.length === 0}>
          <CardLayer
            cards={state.cards}
            scale={canvasScale}
            interactive={!isDrawing}
            emit={emit}
          />
          <DrawLayer
            ref={drawLayerRef}
            tool={drawTool}
            color={drawColor}
            strokeWidth={drawWidth}
            scale={canvasScale}
            socket={socket}
            connected={connected}
            active={isDrawing}
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

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        topDeckConfig={topDeckConfig}
        onTopDeckConfigChange={setTopDeckConfig}
        hasServerKey={hasServerKey}
        role="caster"
      />
    </div>
  );
}
