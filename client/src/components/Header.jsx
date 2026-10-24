import React from 'react';
import { 
  Terminal, 
  User, 
  Volume2, 
  VolumeX, 
  Server,
  MessageSquare,
  Activity,
  Calendar,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export function Header({ 
  activeTab, 
  onSelectTab, 
  onOpenProfile, 
  speechEnabled, 
  onToggleSpeech,
  health,
  metricsLoading
}) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Engine status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 via-cyan-400 to-emerald-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-teal-500/20">
              <Terminal className="w-5 h-5 text-slate-950" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="pulse-beacon absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Ask-Rodrigo
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 font-mono font-medium">
                  AGy-cli Bridge
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <Server className="w-3 h-3 text-teal-400" />
              <span>Debian 13 VPS</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400">
                {health?.aiEngine?.includes('AGy-cli') ? 'Antigravity CLI Live' : 'Conectado'}
              </span>
            </p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 text-xs font-medium">
          <button
            onClick={() => onSelectTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Agente</span>
          </button>

          <button
            onClick={() => onSelectTab('metrics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'metrics'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Servidor & Métricas</span>
          </button>

          <button
            onClick={() => onSelectTab('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'calendar'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendario & Citas</span>
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Audio speech toggle */}
          <button
            onClick={onToggleSpeech}
            title={speechEnabled ? 'Desactivar lectura por voz' : 'Activar lectura por voz'}
            className={`p-2 rounded-lg border text-sm transition-all ${
              speechEnabled
                ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white'
            }`}
          >
            {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Quick CV profile drawer button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
          >
            <User className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">Perfil / CV</span>
          </button>

          {/* External therodrigo.com link */}
          <a
            href="https://therodrigo.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir therodrigo.com"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-400 hover:text-teal-400 text-xs transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
