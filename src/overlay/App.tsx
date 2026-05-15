import { useEffect, useState } from "react";
import { useRoom, useSocket } from "@shared/socket";
import { DEFAULT_NAMEPLATE_STYLE, OVERLAY_HEIGHT, OVERLAY_WIDTH } from "@shared/constants";
import { useBrandSettings } from "@shared/brand";
import { readCachedOverlayStyleSettings, useOverlayStyleSettings } from "@shared/overlay-style";
import type { NamePlate, DecklistOverlayData, OverlayStyleSettings, StreamPlayerStats, PodSummaryData } from "@shared/types";
import { CardRenderer } from "./components/CardRenderer";
import { DrawRenderer } from "./components/DrawRenderer";
import { Spotlight } from "./components/Spotlight";
import { NamePlates } from "./components/NamePlates";
import { DecklistOverlay } from "./components/DecklistOverlay";
import { PodSummary } from "./components/PodSummary";

export function App() {
  const { socket, connected } = useSocket("overlay");
  const { state } = useRoom(socket);
  useBrandSettings(socket);
  const [namePlates, setNamePlates] = useState<NamePlate[] | null>(null);
  const [streamStats, setStreamStats] = useState<StreamPlayerStats[] | null>(null);
  const [decklist, setDecklist] = useState<DecklistOverlayData | null>(null);
  const [podSummary, setPodSummary] = useState<PodSummaryData | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<OverlayStyleSettings | null>(
    () => readCachedOverlayStyleSettings(),
  );
  useOverlayStyleSettings(socket, setOverlayStyle);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: NamePlate[] | null) => setNamePlates(data);
    s.on("namePlates:updated", handler);
    return () => { s.off("namePlates:updated", handler); };
  }, [socket]);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: StreamPlayerStats[] | null) => setStreamStats(data);
    s.on("streamStats:updated", handler);
    return () => { s.off("streamStats:updated", handler); };
  }, [socket]);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: DecklistOverlayData | null) => setDecklist(data);
    s.on("decklist:updated", handler);
    return () => { s.off("decklist:updated", handler); };
  }, [socket]);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;
    const handler = (data: PodSummaryData | null) => setPodSummary(data);
    s.on("podSummary:updated", handler);
    return () => { s.off("podSummary:updated", handler); };
  }, [socket]);

  const spotlightCard = state.spotlight;

  return (
    <div
      style={{
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        position: "relative",
        background: "transparent",
        overflow: "hidden",
      }}
    >
      {/* Card layer */}
      <div style={{ position: "absolute", inset: 0, zIndex: 10 }}>
        <CardRenderer cards={state.cards} />
      </div>

      {/* Drawing layer */}
      <DrawRenderer socket={socket} connected={connected} />

      {/* Name plates */}
      <NamePlates
        plates={namePlates}
        stats={streamStats}
        style={overlayStyle?.nameplateStyle ?? DEFAULT_NAMEPLATE_STYLE}
      />

      {/* Decklist */}
      <DecklistOverlay data={decklist} />

      {/* Pod Summary */}
      <PodSummary data={podSummary} />

      {/* Spotlight */}
      <Spotlight card={spotlightCard} />

    </div>
  );
}
