import { type RefObject, useCallback, useState } from "react";
import type { TopDeckConfig, TopDeckTable, NamePlate } from "@shared/types";
import { SearchPanel } from "./SearchPanel";
import { DecklistPanel } from "./DecklistPanel";
import { TournamentPanel } from "./TournamentPanel";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  emit: (event: string, data?: unknown) => void;
  topDeckConfig: TopDeckConfig | null;
  hasServerKey: boolean;
  streamTable: TopDeckTable | null;
  setStreamTable: (table: TopDeckTable | null, plates: NamePlate[] | null) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const TABS = [
  { key: "search", label: "Search" },
  { key: "deck", label: "Deck" },
  { key: "tournament", label: "Tournament" },
];

export function Sidebar({
  activeTab,
  setActiveTab,
  emit,
  topDeckConfig,
  hasServerKey,
  streamTable,
  setStreamTable,
  searchInputRef,
}: Props) {
  const [pendingPlayerId, setPendingPlayerId] = useState<string | null>(null);

  const handleSetStreamTable = useCallback((table: TopDeckTable | null, plates: NamePlate[] | null) => {
    setStreamTable(table, plates);
    if (table) setActiveTab("deck");
  }, [setStreamTable, setActiveTab]);

  const handleSelectPlayer = useCallback((playerId: string) => {
    setPendingPlayerId(playerId);
    setActiveTab("deck");
  }, [setActiveTab]);

  const handlePlayerConsumed = useCallback(() => {
    setPendingPlayerId(null);
  }, []);

  return (
    <div className="flex flex-col border-r border-border bg-bg-raised overflow-hidden">
      {/* Tab buttons */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-xs font-medium tracking-wide uppercase transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-gold text-brand"
                : "text-text-dim hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "search" && (
          <SearchPanel emit={emit} searchInputRef={searchInputRef} />
        )}
        {activeTab === "deck" && (
          <DecklistPanel
            emit={emit}
            topDeckConfig={topDeckConfig}
            hasServerKey={hasServerKey}
            streamTable={streamTable}
            pendingPlayerId={pendingPlayerId}
            onPlayerConsumed={handlePlayerConsumed}
          />
        )}
        {activeTab === "tournament" && (
          <TournamentPanel
            config={topDeckConfig}
            hasServerKey={hasServerKey}
            streamTable={streamTable}
            onSetStreamTable={handleSetStreamTable}
            onSelectPlayer={handleSelectPlayer}
          />
        )}
      </div>
    </div>
  );
}
