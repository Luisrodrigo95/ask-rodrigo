import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  BellRing,
  CalendarDays,
  SquareCheckBig,
  StickyNote,
  CodeXml,
  Cpu,
  Search,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  Clock,
  ExternalLink,
  ShieldCheck,
  LogOut,
  FileText
} from 'lucide-react';
import rodrigoIcon from '../assets/rodrigo-icon.png';

export function PrimaryRail({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  onOpenProfile,
  onOpenNotes,
  onOpenSettings,
  currentUser,
  onOpenLogin,
  onLogout,
  clockSeconds = 7420,
  isClockRunning = true,
  t
}) {

  const isAdmin = currentUser?.role === 'admin';
  const tr = t.rail;

  const formatTimer = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const navItems = isAdmin
    ? [
        {
          id: 'chat',
          label: tr.chats,
          icon: MessageSquare,
          active: activeTab === 'chat',
          onClick: () => onSelectTab('chat'),
          badge: null
        },
        {
          id: 'calendar',
          label: tr.calendar,
          icon: CalendarDays,
          active: activeTab === 'calendar',
          onClick: () => onSelectTab('calendar'),
          badge: null
        },
        {
          id: 'notes',
          label: tr.notes,
          icon: StickyNote,
          active: false,
          onClick: () => (onOpenNotes ? onOpenNotes() : onOpenProfile()),
          badge: null
        },
        { divider: true },
        {
          id: 'clock',
          label: tr.clock || 'Clock',
          icon: Clock,
          active: activeTab === 'clock',
          onClick: () => onSelectTab('clock'),
          badge: isClockRunning ? 'ON' : null,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 font-mono text-[10.5px]'
        },
        {
          id: 'development',
          label: tr.development || 'Developer',
          icon: CodeXml,
          active: activeTab === 'development',
          onClick: () => onSelectTab('development'),
          badge: null
        },

        {
          id: 'metrics',
          label: tr.infrastructure,
          icon: Cpu,
          active: activeTab === 'metrics',
          onClick: () => onSelectTab('metrics'),
          badge: null
        }
      ]
    : [
        {
          id: 'chat',
          label: tr.chats,
          icon: MessageSquare,
          active: activeTab === 'chat',
          onClick: () => onSelectTab('chat'),
          badge: null
        },
        {
          id: 'cv',
          label: tr.cv || 'CV',
          icon: FileText,
          active: false,
          onClick: () => onOpenProfile(),
          badge: null
        },
        {
          id: 'calendar',
          label: tr.calendar,
          icon: CalendarDays,
          active: activeTab === 'calendar',
          onClick: () => onSelectTab('calendar'),
          badge: null
        }
      ];

  return (
    <nav
      aria-label="Main Navigation"
      data-v2-rail-root="true"
      className={`relative hidden md:flex shrink-0 flex-col border-r border-edge bg-paper py-3 transition-all duration-200 select-none ${
        isCollapsed ? 'w-16 px-2 items-center' : 'w-[224px] px-2.5 items-stretch'
      }`}
    >
      {/* Top Branding / Logo */}
      <div className={`mb-3 flex items-center gap-2.5 ${isCollapsed ? 'justify-center px-0' : 'px-1'}`}>
        <button
          onClick={() => onSelectTab('chat')}
          className="relative h-[34px] w-[34px] shrink-0 overflow-hidden rounded-[10px] ring-1 ring-white/10 shadow-[0_2px_8px_rgba(0,0,0,.35)] cursor-pointer hover:opacity-90 hover:ring-accent/50 transition-all"
          title="Ask Rodrigo"
        >
          <img src={rodrigoIcon} alt="Ask Rodrigo" className="w-full h-full object-cover" />
        </button>
        {!isCollapsed && (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-semibold text-ink leading-tight">
              Ask Rodrigo
            </span>
            <span className="text-[10px] font-mono text-muted flex items-center gap-1">
              {isAdmin ? (
                <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> {currentUser?.isOwner ? 'AGy Owner' : 'AGy Collab'}
                </span>
              ) : (
                <span>Guest Mode</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:none] items-stretch gap-0.5">
        {navItems.map((item, idx) => {
          if (item.divider) {
            return (
              <div
                key={`div-${idx}`}
                className={`my-1.5 h-px bg-edge ${isCollapsed ? 'w-8 mx-auto' : 'mx-2'}`}
              />
            );
          }

          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              title={isCollapsed ? item.label : undefined}
              className={`flex h-9 w-full shrink-0 items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] transition-colors cursor-pointer ${
                item.active
                  ? 'bg-panel font-medium text-ink shadow-v2-sm ring-1 ring-edge'
                  : 'text-ink/80 hover:bg-sunken hover:text-ink'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <span
                className={`grid w-5 shrink-0 place-items-center ${
                  item.active ? 'text-accent' : 'text-muted'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
              </span>
              {!isCollapsed && (
                <>
                  <span className="min-w-0 flex-1 text-left truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[11px] ${
                        item.badgeColor || 'bg-sunken text-muted'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Marvin Clock-in Card */}
      {!isCollapsed ? (
        <div
          onClick={() => onSelectTab('clock')}
          className="mx-0.5 my-2.5 p-2 rounded-[12px] bg-panel border border-edge shadow-v2-sm hover:border-accent/40 cursor-pointer transition-all group"
          title="Clic para gestionar fichaje (Clock)"
        >
          <div className="flex items-center justify-between gap-1 text-[11px] text-muted mb-1">
            <span className="flex items-center gap-1.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isClockRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {isClockRunning ? tr.clockedIn : (tr.clockedOut || 'Detenido')}
            </span>
            <span className="font-mono text-[11px] text-accent font-medium">
              {formatTimer(clockSeconds)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-edge/60">
            <span className="text-[12px] font-medium text-ink truncate group-hover:text-accent transition-colors">
              {currentUser?.name || 'Luis Garcia'}
            </span>
            <a
              href="https://therodrigo.com"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-muted hover:text-accent p-0.5 transition-colors"
              title="therodrigo.com"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : (
        <div className="my-2 flex justify-center">
          <button
            onClick={() => onSelectTab('clock')}
            className="cursor-pointer"
            title={`${isClockRunning ? tr.clockedIn : (tr.clockedOut || 'Detenido')}: ${formatTimer(clockSeconds)}`}
          >
            <span
              className={`block w-2.5 h-2.5 rounded-full ${
                isClockRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </button>
        </div>
      )}

      {/* Bottom Utility Controls */}
      <div className="pt-2 border-t border-edge flex flex-col gap-1 items-stretch">
        <button
          onClick={() => onSelectTab('chat')}
          className={`flex h-8 items-center gap-2.5 rounded-[8px] text-[12.5px] text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center w-full px-0' : 'px-2'
          }`}
          title={tr.search}
        >
          <Search className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">{tr.search}</span>}
        </button>

        <button
          onClick={onOpenSettings}
          className={`flex h-8 items-center gap-2.5 rounded-[8px] text-[12.5px] text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center w-full px-0' : 'px-2'
          }`}
          title={tr.settings}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span className="truncate">{tr.settings}</span>}
        </button>

        <button
          onClick={onToggleCollapse}
          className={`flex h-8 items-center gap-2.5 rounded-[8px] text-[12.5px] text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer ${
            isCollapsed ? 'justify-center w-full px-0' : 'px-2'
          }`}
          title={isCollapsed ? tr.expand : tr.collapse}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 shrink-0 text-accent" />
          ) : (
            <>
              <PanelLeftClose className="w-4 h-4 shrink-0" />
              <span className="truncate">{tr.collapse}</span>
            </>
          )}
        </button>

        {/* User Card / Login Trigger & Logout */}
        <div className="mt-1 pt-1.5 border-t border-edge/60">
          <div className="flex items-center gap-1">
            <button
              onClick={() => (isAdmin ? onOpenProfile() : onOpenLogin())}
              className={`flex flex-1 min-w-0 items-center gap-2 rounded-[10px] p-1.5 text-left transition-colors hover:bg-sunken cursor-pointer ${
                isCollapsed ? 'justify-center' : ''
              }`}
              title={currentUser?.email || currentUser?.name || 'User'}
            >
              {currentUser?.picture ? (
                <img
                  src={currentUser.picture}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-edge shrink-0"
                />
              ) : (
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    isAdmin
                      ? 'bg-gradient-to-tr from-teal-500 to-emerald-400'
                      : 'bg-gradient-to-tr from-slate-600 to-slate-500'
                  }`}
                >
                  {isAdmin
                    ? (currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'RG')
                    : <User className="w-3.5 h-3.5" />}
                </div>
              )}
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-semibold text-ink">
                      {currentUser?.name || (isAdmin ? 'Rodrigo García' : 'Guest Explorer')}
                    </p>
                    {isAdmin && (
                      <span className={`text-[8.5px] px-1 py-0.2 rounded font-mono ${
                        currentUser?.isOwner
                          ? 'bg-amber-500/15 text-amber-400 font-semibold'
                          : currentUser?.canEditProjects
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}>
                        {currentUser?.isOwner ? 'Owner' : currentUser?.canEditProjects ? 'Editor' : 'Collab'}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-muted font-mono">
                    {currentUser?.email || (isAdmin ? 'lg2012garcia@gmail.com' : 'Click to authenticate')}
                  </p>
                </div>
              )}
            </button>

            {/* Logout Button (when logged in / admin) */}
            {isAdmin && !isCollapsed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLogout?.();
                }}
                className="flex items-center justify-center w-7 h-7 shrink-0 rounded-[8px] text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                title={tr.logout || 'Cerrar sesión'}
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Collapsed mode logout icon */}
          {isAdmin && isCollapsed && (
            <button
              type="button"
              onClick={() => onLogout?.()}
              className="mt-1 flex w-full items-center justify-center h-7 rounded-[8px] text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              title={tr.logout || 'Cerrar sesión'}
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
