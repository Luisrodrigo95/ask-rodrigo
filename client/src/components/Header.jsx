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
  ExternalLink,
  Shield,
  Lock,
  LogOut,
  LogIn,
  Settings
} from 'lucide-react';
import rodrigoIcon from '../assets/rodrigo-icon.png';

export function Header({ 
  activeTab, 
  onSelectTab, 
  onOpenProfile, 
  speechEnabled, 
  onToggleSpeech,
  health,
  metricsLoading,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenSettings,
  t
}) {
  const isAdmin = currentUser?.role === 'admin';
  const ht = t.header;

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Engine status */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg ring-1 ring-white/10 shrink-0">
              <img src={rodrigoIcon} alt="Ask Rodrigo" className="w-full h-full object-cover" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className={`pulse-beacon absolute inline-flex h-full w-full rounded-full opacity-75 ${isAdmin ? 'bg-emerald-400' : 'bg-teal-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 border-2 border-slate-900 ${isAdmin ? 'bg-emerald-500' : 'bg-teal-500'}`}></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                {ht.title}
                {isAdmin ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-medium flex items-center gap-1">
                    <span>👑</span>
                    <span>{ht.adminBadge}</span>
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono font-medium flex items-center gap-1">
                    <span>👤</span>
                    <span>{ht.guestBadge}</span>
                  </span>
                )}
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <Server className="w-3 h-3 text-teal-400" />
              <span>{ht.vpsLabel}</span>
              <span className="text-slate-600">•</span>
              <span className={isAdmin ? 'text-emerald-400' : 'text-teal-400'}>
                {isAdmin ? ht.engineStatusAdmin : ht.engineStatusGuest}
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
            <span>{ht.tabChat}</span>
          </button>

          <button
            onClick={() => {
              if (isAdmin) {
                onSelectTab('metrics');
              } else {
                onOpenLogin('admin');
              }
            }}
            title={!isAdmin ? ht.lockedNotice : ht.tabMetrics}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'metrics'
                ? 'bg-teal-600 text-white shadow-sm'
                : !isAdmin 
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{ht.tabMetrics}</span>
            {!isAdmin && <Lock className="w-3 h-3 text-amber-400/80 ml-0.5" />}
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
            <span>{ht.tabCalendar}</span>
          </button>
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Audio speech toggle */}
          <button
            onClick={onToggleSpeech}
            title={speechEnabled ? ht.speechDisable : ht.speechEnable}
            className={`p-2 rounded-lg border text-sm transition-all ${
              speechEnabled
                ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white'
            }`}
          >
            {speechEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title={ht.settingsBtn}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-400 hover:text-teal-400 text-sm transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Quick CV profile drawer button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all"
          >
            <User className="w-3.5 h-3.5 text-teal-400" />
            <span className="hidden sm:inline">{ht.profileBtn}</span>
          </button>

          {/* Login / Switch Account Button */}
          {isAdmin ? (
            <button
              onClick={onLogout}
              title={ht.adminLogout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{ht.adminLogout}</span>
            </button>
          ) : (
            <button
              onClick={() => onOpenLogin('admin')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-medium transition-all shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{ht.iamRodrigo}</span>
            </button>
          )}

          {/* External therodrigo.com link */}
          <a
            href="https://therodrigo.com"
            target="_blank"
            rel="noopener noreferrer"
            title={ht.openPortfolio}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-400 hover:text-teal-400 text-xs transition-all"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
