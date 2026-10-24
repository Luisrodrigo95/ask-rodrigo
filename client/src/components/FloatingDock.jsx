import React from 'react';
import {
  Globe,
  Volume2,
  VolumeX,
  Bot,
  Settings,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export function FloatingDock({
  currentLanguage,
  onToggleLanguage,
  speechEnabled,
  onToggleSpeech,
  isSubagentsOpen,
  onToggleSubagents,
  onOpenSettings,
  isAdmin
}) {
  return (
    <aside
      aria-label="Schnellzugriff"
      className="fixed right-3 bottom-5 z-40 hidden sm:flex items-center gap-1.5 p-1.5 rounded-full bg-panel/90 border border-edge backdrop-blur-md shadow-v2-md transition-all select-none hover:border-accent/40"
    >
      {/* Language Switcher */}
      <button
        onClick={onToggleLanguage}
        className="px-2 py-1 rounded-full text-[11px] font-semibold font-mono text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
        title={`Change language (currently ${currentLanguage.toUpperCase()})`}
      >
        {currentLanguage.toUpperCase()}
      </button>

      <div className="w-px h-3.5 bg-edge" />

      {/* Speech Audio Toggle */}
      <button
        onClick={onToggleSpeech}
        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
          speechEnabled
            ? 'text-accent bg-accent/15'
            : 'text-muted hover:text-ink hover:bg-sunken'
        }`}
        title={speechEnabled ? 'Disable voice synthesis' : 'Enable voice synthesis'}
      >
        {speechEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      </button>

      {/* Subagent / Inspector Toggle */}
      {isAdmin && (
        <button
          onClick={onToggleSubagents}
          className={`p-1.5 rounded-full transition-colors relative cursor-pointer ${
            isSubagentsOpen
              ? 'text-accent bg-accent/15'
              : 'text-muted hover:text-ink hover:bg-sunken'
          }`}
          title="Toggle Subagent & Inspector Panel"
        >
          <Bot className="w-3.5 h-3.5" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </button>
      )}

      {/* Settings Modal Button */}
      <button
        onClick={onOpenSettings}
        className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
        title="Settings"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
}
