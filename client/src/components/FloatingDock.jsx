import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Bot,
  Settings,
  ChevronRight,
  ChevronLeft,
  GripVertical
} from 'lucide-react';

export function FloatingDock({
  currentLanguage,
  onToggleLanguage,
  speechEnabled,
  onToggleSpeech,
  isSubagentsOpen,
  onToggleSubagents,
  onOpenSettings,
  isAdmin,
  isVisible = true,
  onToggleVisible
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('ask_rodrigo_dock_collapsed') === 'true');

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ask_rodrigo_dock_collapsed', String(next));
      return next;
    });
  };

  // If completely hidden via VS Code or user toggle
  if (!isVisible) {
    return null;
  }

  // If collapsed: show discreet edge trigger tab on the right
  if (isCollapsed) {
    return (
      <button
        onClick={handleToggleCollapse}
        aria-label="Schnellzugriff ausklappen"
        className="fixed right-0 bottom-5 z-40 hidden sm:flex items-center gap-1 pl-2.5 pr-1.5 py-1.5 rounded-l-full bg-panel/90 border border-r-0 border-edge backdrop-blur-md shadow-v2-md text-muted hover:text-ink hover:bg-sunken transition-all cursor-pointer select-none group hover:border-accent/40"
        title="Mostrar Schnellzugriff (Quick Access)"
      >
        <ChevronLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span className="text-[10px] font-mono uppercase tracking-wider text-accent font-semibold pr-0.5">Dock</span>
      </button>
    );
  }

  return (
    <aside
      aria-label="Schnellzugriff"
      data-v2-dock="mr"
      className="fixed right-3 bottom-5 z-40 hidden sm:flex items-center gap-1.5 p-1.5 rounded-full bg-panel/90 border border-edge backdrop-blur-md shadow-v2-md transition-all select-none hover:border-accent/40 animate-fade-in"
    >
      {/* Decorative grip */}
      <div className="text-muted/40 pl-1 pr-0.5 cursor-default" title="Schnellzugriff">
        <GripVertical className="w-3 h-3" />
      </div>

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

      <div className="w-px h-3.5 bg-edge" />

      {/* Collapse Schnellzugriff Button */}
      <button
        onClick={handleToggleCollapse}
        aria-label="Schnellzugriff einklappen"
        className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
        title="Esconder Schnellzugriff"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </aside>
  );
}
