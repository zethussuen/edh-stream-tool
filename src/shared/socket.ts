import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { DrawStroke, OverlayCard, RoomState, SpotlightData } from "./types";
import { OVERLAY_HEIGHT, OVERLAY_WIDTH } from "./constants";

export function getRoom(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("room") || "default";
}

export function createSocket(role: string): Socket {
  const room = getRoom();
  return io({
    query: { room, role },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
  });
}

export function useSocket(role: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = createSocket(role);
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [role]);

  return { socket: socketRef, connected };
}

const emptyState: RoomState = {
  cards: [],
  spotlight: null,
  settings: { overlayWidth: OVERLAY_WIDTH, overlayHeight: OVERLAY_HEIGHT },
};

export function useRoom(socket: React.RefObject<Socket | null>) {
  const [state, setState] = useState<RoomState>(emptyState);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    function onStateFull(data: RoomState) {
      setState(data);
    }
    function onCardAdded(card: OverlayCard) {
      setState((prev) => ({ ...prev, cards: [...prev.cards, card] }));
    }
    function onCardMoved({ id, x, y }: { id: string; x: number; y: number }) {
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) => (c.id === id ? { ...c, x, y } : c)),
      }));
    }
    function onCardResized({
      id,
      width,
      height,
    }: {
      id: string;
      width: number;
      height: number;
    }) {
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) =>
          c.id === id ? { ...c, width, height } : c,
        ),
      }));
    }
    function onCardRemoved({ id }: { id: string }) {
      setState((prev) => ({
        ...prev,
        cards: prev.cards.filter((c) => c.id !== id),
      }));
    }
    function onCardZChanged({ id, zIndex }: { id: string; zIndex: number }) {
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) => (c.id === id ? { ...c, zIndex } : c)),
      }));
    }
    function onSpotlightUpdated(data: SpotlightData) {
      setState((prev) => ({ ...prev, spotlight: data }));
    }
    function onSpotlightCleared() {
      setState((prev) => ({ ...prev, spotlight: null }));
    }

    s.on("state:full", onStateFull);
    s.on("card:added", onCardAdded);
    s.on("card:moved", onCardMoved);
    s.on("card:resized", onCardResized);
    s.on("card:removed", onCardRemoved);
    s.on("card:zChanged", onCardZChanged);
    s.on("spotlight:updated", onSpotlightUpdated);
    s.on("spotlight:cleared", onSpotlightCleared);

    return () => {
      s.off("state:full", onStateFull);
      s.off("card:added", onCardAdded);
      s.off("card:moved", onCardMoved);
      s.off("card:resized", onCardResized);
      s.off("card:removed", onCardRemoved);
      s.off("card:zChanged", onCardZChanged);
      s.off("spotlight:updated", onSpotlightUpdated);
      s.off("spotlight:cleared", onSpotlightCleared);
    };
  }, [socket]);

  const emit = useCallback(
    (event: string, data?: unknown) => {
      socket.current?.emit(event, data);
    },
    [socket],
  );

  return { state, emit };
}

export function useDrawReceiver(
  socket: React.RefObject<Socket | null>,
  connected: boolean,
  onStroke: (stroke: DrawStroke & { senderId?: string }) => void,
  onUndo: () => void,
  onClear: () => void,
  onProgress?: (stroke: DrawStroke & { senderId: string }) => void,
) {
  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    s.on("draw:stroke", onStroke);
    s.on("draw:undo", onUndo);
    s.on("draw:clear", onClear);
    if (onProgress) s.on("draw:progress", onProgress);

    return () => {
      s.off("draw:stroke", onStroke);
      s.off("draw:undo", onUndo);
      s.off("draw:clear", onClear);
      if (onProgress) s.off("draw:progress", onProgress);
    };
  }, [socket, connected, onStroke, onUndo, onClear, onProgress]);
}
