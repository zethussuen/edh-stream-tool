import { type RefObject } from "react";
import type { TopDeckConfig } from "@shared/types";
import { SearchPanel } from "./SearchPanel";
import { DecklistPanel } from "./DecklistPanel";
import { TournamentPanel } from "./TournamentPanel";

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  emit: (event: string, data?: unknown) => void;
  topDeckConfig: TopDeckConfig | null;
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
  searchInputRef,
}: Props) {
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
                ? "border-b-2 border-gold text-gold"
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
        {activeTab === "deck" && <DecklistPanel emit={emit} />}
        {activeTab === "tournament" && (
          <TournamentPanel config={topDeckConfig} emit={emit} />
        )}
      </div>
    </div>
  );
}
