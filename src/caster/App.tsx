import { useCallback, useEffect, useRef, useState } from "react";
import type { DrawTool, TopDeckConfig } from "@shared/types";
import { DRAW_COLORS, DRAW_WIDTHS, OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { useRoom, useSocket } from "@shared/socket";
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

  // Drawing state
  const [drawTool, setDrawTool] = useState<DrawTool>("select");
  const [drawColor, setDrawColor] = useState<string>(DRAW_COLORS[0]);
  const [drawWidth, setDrawWidth] = useState<number>(DRAW_WIDTHS[1]);

  // Sidebar
  const [activeTab, setActiveTab] = useState("search");

  // Settings
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
          onClearCards={handleClearCards}
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
        searchInputRef={searchInputRef}
      />

      {/* Preview Canvas */}
      <div ref={canvasContainerRef} className="relative overflow-hidden bg-bg-base">
        <PreviewCanvas socket={socket} connected={connected}>
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
          emit={emit}
        />
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        topDeckConfig={topDeckConfig}
        onTopDeckConfigChange={setTopDeckConfig}
      />
    </div>
  );
}
