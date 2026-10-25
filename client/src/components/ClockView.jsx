import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Edit3,
  Check,
  X,
  History,
  Calendar,
  Sparkles,
  ShieldCheck,
  Plus,
  Minus,
  MessageSquare,
  Coffee,
  Laptop
} from 'lucide-react';

function formatTimer(totalSeconds) {
  const safeSec = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = safeSec % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function ClockView({
  secondsElapsed = 0,
  isRunning = false,
  onStart,
  onStop,
  onEdit,
  onReset,
  currentUser,
  t
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editHours, setEditHours] = useState(0);
  const [editMinutes, setEditMinutes] = useState(0);
  const [editSeconds, setEditSeconds] = useState(0);

  // Session Logs & Notes
  const [sessionLogs, setSessionLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('ask_rodrigo_clock_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [sessionNote, setSessionNote] = useState('');

  const tc = t?.clockView || {};

  // Open edit mode prefilled with current elapsed values
  const handleOpenEdit = () => {
    const hours = Math.floor(secondsElapsed / 3600);
    const minutes = Math.floor((secondsElapsed % 3600) / 60);
    const seconds = secondsElapsed % 60;
    setEditHours(hours);
    setEditMinutes(minutes);
    setEditSeconds(seconds);
    setIsEditing(true);
  };

  const handleSaveEdit = (e) => {
    e?.preventDefault();
    const total = Math.max(0, (parseInt(editHours) || 0) * 3600 + (parseInt(editMinutes) || 0) * 60 + (parseInt(editSeconds) || 0));
    onEdit && onEdit(total);
    setIsEditing(false);

    // Record edit log
    addLog({
      type: 'edit',
      title: tc.editSuccess || 'Tiempo editado manualmente',
      detail: `Ajustado a ${formatTimer(total)}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  };

  const addLog = (logItem) => {
    setSessionLogs((prev) => {
      const updated = [
        {
          id: Date.now(),
          ...logItem,
          date: new Date().toLocaleDateString()
        },
        ...prev.slice(0, 49) // Keep last 50
      ];
      try {
        localStorage.setItem('ask_rodrigo_clock_logs', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const handleToggleTimer = () => {
    if (isRunning) {
      onStop && onStop();
      addLog({
        type: 'pause',
        title: tc.pausedAt || 'Fichaje detenido / pausado',
        detail: `Detenido en ${formatTimer(secondsElapsed)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
    } else {
      onStart && onStart();
      addLog({
        type: 'start',
        title: tc.newSession || 'Fichaje iniciado / reanudado',
        detail: `Reanudado en ${formatTimer(secondsElapsed)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
    }
  };

  const handleConfirmReset = () => {
    if (window.confirm(tc.resetConfirm || '¿Estás seguro de que deseas reiniciar el contador a 00:00:00?')) {
      onReset && onReset();
      addLog({
        type: 'reset',
        title: tc.reset || 'Contador reiniciado',
        detail: 'Reiniciado a 00:00:00',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      });
    }
  };

  const applyPresetAdjustment = (secDelta) => {
    const next = Math.max(0, secondsElapsed + secDelta);
    onEdit && onEdit(next);
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!sessionNote.trim()) return;
    addLog({
      type: 'note',
      title: 'Nota de sesión',
      detail: sessionNote.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setSessionNote('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-paper overflow-y-auto [scrollbar-width:thin] p-3.5 sm:p-6 lg:p-8 pb-20 md:pb-8 select-text">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header Title & Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-edge">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-[12px] bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shadow-v2-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                  {tc.title || 'Control Horario & Fichaje'}
                </h1>
                <p className="text-xs text-muted mt-0.5">
                  {tc.subtitle || 'Controla, inicia, detén y edita tus sesiones de trabajo activas.'}
                </p>
              </div>
            </div>
          </div>

          {/* Current Live Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border shadow-v2-sm ${
                isRunning
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRunning
                    ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]'
                    : 'bg-amber-400'
                }`}
              />
              <span>{isRunning ? (tc.statusActive || 'Clocked in') : (tc.statusPaused || 'Clocked out')}</span>
            </span>
          </div>
        </div>

        {/* Hero Timer Display Card */}
        <div className="relative rounded-[24px] bg-gradient-to-b from-panel to-panel/80 border border-edge shadow-v2-md p-5 sm:p-8 flex flex-col items-center justify-center text-center overflow-hidden">
          {/* Subtle background glow */}
          <div
            className={`absolute -top-24 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
              isRunning ? 'bg-emerald-500/15 opacity-100' : 'bg-accent/10 opacity-60'
            }`}
          />

          <span className="text-xs font-mono uppercase tracking-widest text-muted font-medium mb-3">
            {tc.todayTotal || 'Tiempo Transcurrido'}
          </span>

          {/* Digital Time Readout */}
          <div className="font-mono text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-ink drop-shadow-sm select-none my-2">
            {formatTimer(secondsElapsed)}
          </div>
          <span className="text-[11px] font-mono text-muted/70 tracking-wider mb-6">
            {tc.hours || 'HORAS'} : {tc.minutes || 'MIN'} : {tc.seconds || 'SEG'}
          </span>

          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md pt-2">
            <button
              onClick={handleToggleTimer}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-[16px] text-sm font-semibold transition-all shadow-v2-md cursor-pointer active:scale-95 ${
                isRunning
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 hover:border-amber-500/60'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>{tc.pause || 'Detener (Pause)'}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>{tc.start || 'Iniciar (Clock In)'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleOpenEdit}
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-[16px] bg-sunken hover:bg-panel border border-edge hover:border-accent/40 text-xs sm:text-sm font-medium text-ink transition-all shadow-v2-sm cursor-pointer active:scale-95"
              title={tc.edit || 'Editar tiempo'}
            >
              <Edit3 className="w-4 h-4 text-accent" />
              <span>{tc.edit || 'Editar'}</span>
            </button>

            <button
              onClick={handleConfirmReset}
              className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-[16px] bg-sunken/60 hover:bg-rose-500/10 border border-edge/60 hover:border-rose-500/30 text-muted hover:text-rose-400 text-xs sm:text-sm transition-all cursor-pointer"
              title={tc.reset || 'Reiniciar'}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">{tc.reset || 'Reiniciar'}</span>
            </button>
          </div>

          {/* Quick Adjustment Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-6 pt-4 border-t border-edge/60 w-full">
            <span className="text-[11px] font-mono text-muted mr-1">
              {tc.quickPresets || 'Ajustes rápidos:'}
            </span>
            <button
              onClick={() => applyPresetAdjustment(-900)}
              className="px-2.5 py-1 rounded-[8px] bg-sunken hover:bg-panel border border-edge text-[11px] font-mono text-muted hover:text-ink cursor-pointer transition-colors"
            >
              -15m
            </button>
            <button
              onClick={() => applyPresetAdjustment(900)}
              className="px-2.5 py-1 rounded-[8px] bg-sunken hover:bg-panel border border-edge text-[11px] font-mono text-muted hover:text-ink cursor-pointer transition-colors"
            >
              +15m
            </button>
            <button
              onClick={() => applyPresetAdjustment(1800)}
              className="px-2.5 py-1 rounded-[8px] bg-sunken hover:bg-panel border border-edge text-[11px] font-mono text-muted hover:text-ink cursor-pointer transition-colors"
            >
              +30m
            </button>
            <button
              onClick={() => applyPresetAdjustment(3600)}
              className="px-2.5 py-1 rounded-[8px] bg-sunken hover:bg-panel border border-edge text-[11px] font-mono text-muted hover:text-ink cursor-pointer transition-colors"
            >
              +1h
            </button>
          </div>
        </div>

        {/* Modal / Dialog: Edit Time */}
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-md rounded-[20px] bg-panel border border-edge shadow-v2-md p-6 space-y-5 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-edge">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-accent" />
                  <h3 className="font-semibold text-ink text-base">
                    {tc.edit || 'Editar Tiempo Transcurrido'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-md text-muted hover:text-ink cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-muted uppercase mb-1.5">
                      {tc.hours || 'Horas'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={editHours}
                      onChange={(e) => setEditHours(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[12px] bg-sunken border border-edge text-ink font-mono text-center text-lg focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-muted uppercase mb-1.5">
                      {tc.minutes || 'Minutos'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[12px] bg-sunken border border-edge text-ink font-mono text-center text-lg focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-muted uppercase mb-1.5">
                      {tc.seconds || 'Segundos'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={editSeconds}
                      onChange={(e) => setEditSeconds(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-[12px] bg-sunken border border-edge text-ink font-mono text-center text-lg focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-[12px] bg-sunken text-xs font-medium text-muted hover:text-ink cursor-pointer transition-colors"
                  >
                    {tc.cancel || 'Cancelar'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-[12px] bg-accent hover:bg-accent/90 text-xs font-semibold text-white shadow-v2-sm cursor-pointer transition-all"
                  >
                    {tc.saveTime || 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User Card & Context Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-[18px] bg-panel border border-edge flex items-center gap-3.5 shadow-v2-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Laptop className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-muted uppercase">Usuario Activo</div>
              <div className="text-sm font-semibold text-ink truncate">
                {currentUser?.name || 'Luis Garcia'}
              </div>
              <div className="text-[11px] text-muted truncate">
                {currentUser?.email || 'lg2012garcia@gmail.com'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-[18px] bg-panel border border-edge flex items-center gap-3.5 shadow-v2-sm">
            <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center text-accent shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-muted uppercase">Sesión de Trabajo</div>
              <div className="text-sm font-semibold text-ink">
                Ask Rodrigo Workspace
              </div>
              <div className="text-[11px] text-muted">
                white-stingray-87538 (Debian 13 VPS)
              </div>
            </div>
          </div>
        </div>

        {/* Session Log & Notes Section */}
        <div className="rounded-[20px] bg-panel border border-edge shadow-v2-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-edge">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-ink">
                {tc.sessionHistory || 'Historial de Sesión y Fichajes'}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-muted">
              {sessionLogs.length} registros
            </span>
          </div>

          {/* Quick Note Input */}
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              placeholder="Añadir una nota sobre esta sesión (ej. Revisando código de PresWin)..."
              className="flex-1 px-3.5 py-2 rounded-[12px] bg-sunken border border-edge text-xs text-ink placeholder-muted focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!sessionNote.trim()}
              className="px-3.5 py-2 rounded-[12px] bg-sunken hover:bg-accent hover:text-white border border-edge text-xs font-medium text-muted transition-colors disabled:opacity-40 cursor-pointer"
            >
              Añadir Nota
            </button>
          </form>

          {/* Logs List */}
          <div className="space-y-2 max-h-64 overflow-y-auto [scrollbar-width:thin] pr-1">
            {sessionLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted">
                {tc.noLogs || 'No hay registros de sesión aún para hoy.'}
              </div>
            ) : (
              sessionLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-[12px] bg-sunken/80 border border-edge/60 text-xs font-mono"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-ink block">{log.title}</span>
                    <span className="text-[11px] text-muted block truncate">{log.detail}</span>
                  </div>
                  <span className="text-[10px] text-muted/70 shrink-0 font-mono">
                    {log.time}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
