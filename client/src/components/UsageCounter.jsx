import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  Calendar,
  RefreshCw,
  X,
  Sliders,
  Check,
  Zap,
  Activity,
  Layers,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { fetchUsage, updateUsageConfig } from '../services/api.js';

// SVG circle constants for radius 8.5 (exact 20x20 container matching user reference)
const CIRCUMFERENCE_SM = 2 * Math.PI * 8.5; // ~53.407075
// SVG circle constants for 64x64 modal visual gauges
const GAUGE_RADIUS = 26;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS; // ~163.36

function formatDurationSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function getStrokeColor(usedPercent) {
  if (usedPercent >= 90) return '#ef4444'; // Red/Rose critical
  if (usedPercent >= 75) return '#f59e0b'; // Amber warning
  return '#2563eb'; // Royal blue default matching reference
}

export function UsageCounter({ currentUser, t }) {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [countdown5h, setCountdown5h] = useState(0);
  const [countdownWeekly, setCountdownWeekly] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Editable config state
  const [limit5hInput, setLimit5hInput] = useState('10000000');
  const [limitWeeklyInput, setLimitWeeklyInput] = useState('50000000');
  const [countCacheInput, setCountCacheInput] = useState(false);

  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin';
  const u = t.usage || {};

  // Initial load
  useEffect(() => {
    loadUsage(false);
    // Poll every 60 seconds
    const interval = setInterval(() => {
      loadUsage(false);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Live countdown timer ticking every 1 second
  useEffect(() => {
    if (!usage) return;
    setCountdown5h(usage.window5h?.resetsInSeconds || 0);
    setCountdownWeekly(usage.weekly?.resetsInSeconds || 0);

    const timer = setInterval(() => {
      setCountdown5h((prev) => Math.max(0, prev - 1));
      setCountdownWeekly((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [usage]);

  // Sync inputs when config arrives
  useEffect(() => {
    if (usage?.config) {
      setLimit5hInput(String(usage.config.limit5h || 10000000));
      setLimitWeeklyInput(String(usage.config.limitWeekly || 50000000));
      setCountCacheInput(Boolean(usage.config.countCache));
    }
  }, [usage]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Click outside to dismiss modal
  useEffect(() => {
    if (!isModalOpen) return;
    const handleClickOutside = (e) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModalOpen]);

  const loadUsage = async (forceRefresh = false) => {
    try {
      setLoading(true);
      const data = await fetchUsage(forceRefresh);
      setUsage(data);
    } catch (err) {
      console.warn('[UsageCounter] fetchUsage error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await updateUsageConfig({
        limit5h: Number(limit5hInput),
        limitWeekly: Number(limitWeeklyInput),
        countCache: countCacheInput
      });
      if (res.stats) {
        setUsage(res.stats);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      setShowConfig(false);
    } catch (err) {
      console.error('[UsageCounter] save config error:', err);
    } finally {
      setSavingConfig(false);
    }
  };

  // Safe fallbacks while loading
  const w5 = usage?.window5h || {
    usedTokens: 0,
    limitTokens: 10000000,
    remainingTokens: 10000000,
    usedPercent: 0,
    remainingPercent: 100,
    formattedUsed: '0',
    formattedLimit: '10.0M',
    formattedRemaining: '10.0M',
    resetsInSeconds: 18000,
    resetsInFormatted: '5h',
    dashLength: '0',
    turns: 0,
    breakdown: { input: 0, output: 0, cache: 0, total: 0 }
  };

  const weekly = usage?.weekly || {
    usedTokens: 0,
    limitTokens: 50000000,
    remainingTokens: 50000000,
    usedPercent: 0,
    remainingPercent: 100,
    formattedUsed: '0',
    formattedLimit: '50.0M',
    formattedRemaining: '50.0M',
    resetsInSeconds: 604800,
    resetsInFormatted: '7d',
    dashLength: '0',
    turns: 0,
    breakdown: { input: 0, output: 0, cache: 0, total: 0 }
  };

  const dashLength5h = ((w5.usedPercent / 100) * CIRCUMFERENCE_SM).toFixed(4);
  const strokeColor5h = getStrokeColor(w5.usedPercent);

  const dashLengthWeekly = ((weekly.usedPercent / 100) * CIRCUMFERENCE_SM).toFixed(4);
  const strokeColorWeekly = getStrokeColor(weekly.usedPercent);

  // Large gauge dash lengths for modal
  const gaugeDash5h = ((w5.usedPercent / 100) * GAUGE_CIRCUMFERENCE).toFixed(2);
  const gaugeDashWeekly = ((weekly.usedPercent / 100) * GAUGE_CIRCUMFERENCE).toFixed(2);

  // Tooltip matching user pattern
  const buttonTooltip = `${w5.formattedUsed} / ${w5.formattedLimit} tokens (${w5.usedPercent}%) · ${w5.remainingPercent}% ${u.remaining || 'restante'} para estas 5 horas · ${u.resetsIn || 'Reinicia en'} ${formatDurationSeconds(countdown5h)}`;

  return (
    <div className="relative inline-flex items-center">
      {/* 
        Circular Progress Button 
        Directly left of the Inspector button
        Follows exact user specification & HTML structure 
      */}
      <button
        ref={triggerRef}
        onClick={() => setIsModalOpen((prev) => !prev)}
        title={buttonTooltip}
        aria-label="Contador de uso de IA"
        className={`flex items-center justify-center p-1.5 rounded-[10px] text-muted hover:text-ink hover:bg-paper transition-all border cursor-pointer select-none ${
          isModalOpen
            ? 'bg-paper border-accent/50 text-accent shadow-sm ring-1 ring-accent/30'
            : 'bg-sunken border-edge hover:border-accent/30'
        }`}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0 block">
          {/* Background circle track */}
          <circle
            cx="10"
            cy="10"
            r="8.5"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="3"
          />
          {/* Foreground filling circle based on 5-hour used percentage */}
          <circle
            cx="10"
            cy="10"
            r="8.5"
            fill="none"
            stroke={strokeColor5h}
            strokeWidth="3"
            strokeDasharray={`${dashLength5h} ${CIRCUMFERENCE_SM}`}
            strokeLinecap="round"
            transform="rotate(-90 10 10)"
            className="transition-all duration-700 ease-out"
          />
        </svg>
      </button>

      {/* 
        Modal / Popover Dropdown on Click 
        Mounted directly to document.body via Portal to escape parent header stacking contexts,
        centered cleanly on screen without top clipping, and elevated to z-[9999] so it never hides behind chat.
      */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsModalOpen(false);
              }
            }}
          >
            <div
              ref={modalRef}
              className="relative w-full max-w-lg my-auto max-h-[90vh] bg-panel border border-edge rounded-2xl shadow-2xl flex flex-col text-ink overflow-hidden animate-fadeIn"
            >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-edge bg-paper/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink leading-tight flex items-center gap-2">
                    <span>{u.title || 'Límites de Uso & Cuota de IA'}</span>
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {u.subtitle || 'Monitoreo en tiempo real de tu cuota de 5 horas y uso semanal'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => loadUsage(true)}
                  disabled={loading}
                  title={u.refresh || 'Actualizar cuota en vivo'}
                  className="p-2 rounded-lg text-muted hover:text-ink hover:bg-sunken border border-transparent hover:border-edge transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  title={u.close || 'Cerrar'}
                  className="p-2 rounded-lg text-muted hover:text-ink hover:bg-sunken border border-transparent hover:border-edge transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* CARD 1: 5-Hour Rolling Usage Window */}
              <div className="p-4 rounded-xl border border-edge bg-sunken/60 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 font-mono">
                      {u.window5h || 'Ventana de 5 Horas'}
                    </span>
                    <span className="text-xs text-muted font-mono">
                      · {w5.turns} {u.turns || 'turnos'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11.5px] font-mono text-muted">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>{u.resetsIn || 'Se reinicia en'}:</span>
                    <strong className="text-accent font-semibold">
                      {formatDurationSeconds(countdown5h)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Gauge 64x64 */}
                  <div className="relative shrink-0 flex items-center justify-center">
                    <svg width="64" height="64" viewBox="0 0 64 64" className="rotate-[-90deg]">
                      <circle
                        cx="32"
                        cy="32"
                        r={GAUGE_RADIUS}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.12"
                        strokeWidth="5"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={GAUGE_RADIUS}
                        fill="none"
                        stroke={strokeColor5h}
                        strokeWidth="5"
                        strokeDasharray={`${gaugeDash5h} ${GAUGE_CIRCUMFERENCE}`}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold font-mono text-ink leading-none">
                        {w5.remainingPercent}%
                      </span>
                      <span className="text-[9px] text-muted font-medium mt-0.5">
                        {u.remaining || 'rest.'}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-semibold text-ink">
                        {w5.remainingPercent}% {u.remaining || 'restante para estas 5 horas'}
                      </span>
                      <span className="text-xs font-mono text-muted">
                        {w5.usedPercent}% {u.used || 'usado'}
                      </span>
                    </div>

                    {/* Linear Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-paper border border-edge overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${w5.usedPercent}%`,
                          backgroundColor: strokeColor5h
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11.5px] font-mono text-muted">
                      <span>
                        Consumo: <strong className="text-ink">{w5.formattedUsed}</strong> / {w5.formattedLimit} tokens
                      </span>
                      <span>
                        Disponible: <strong className="text-emerald-400">{w5.formattedRemaining}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: Weekly Usage Window */}
              <div className="p-4 rounded-xl border border-edge bg-sunken/60 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                      {u.weekly || 'Uso Semanal'}
                    </span>
                    <span className="text-xs text-muted font-mono">
                      · {weekly.turns} {u.turns || 'turnos'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11.5px] font-mono text-muted">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{u.resetsIn || 'Se reinicia en'}:</span>
                    <strong className="text-emerald-400 font-semibold">
                      {formatDurationSeconds(countdownWeekly)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Gauge 64x64 */}
                  <div className="relative shrink-0 flex items-center justify-center">
                    <svg width="64" height="64" viewBox="0 0 64 64" className="rotate-[-90deg]">
                      <circle
                        cx="32"
                        cy="32"
                        r={GAUGE_RADIUS}
                        fill="none"
                        stroke="currentColor"
                        strokeOpacity="0.12"
                        strokeWidth="5"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={GAUGE_RADIUS}
                        fill="none"
                        stroke={strokeColorWeekly}
                        strokeWidth="5"
                        strokeDasharray={`${gaugeDashWeekly} ${GAUGE_CIRCUMFERENCE}`}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-bold font-mono text-ink leading-none">
                        {weekly.remainingPercent}%
                      </span>
                      <span className="text-[9px] text-muted font-medium mt-0.5">
                        {u.remaining || 'rest.'}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-semibold text-ink">
                        {weekly.remainingPercent}% {u.remaining || 'uso semanal restante'}
                      </span>
                      <span className="text-xs font-mono text-muted">
                        {weekly.usedPercent}% {u.used || 'usado'}
                      </span>
                    </div>

                    {/* Linear Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-paper border border-edge overflow-hidden mb-2">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${weekly.usedPercent}%`,
                          backgroundColor: strokeColorWeekly
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11.5px] font-mono text-muted">
                      <span>
                        Consumo semanal: <strong className="text-ink">{weekly.formattedUsed}</strong> / {weekly.formattedLimit} tokens
                      </span>
                      <span>
                        Disponible: <strong className="text-emerald-400">{weekly.formattedRemaining}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: Technical Token Breakdown */}
              <div className="p-3.5 rounded-xl border border-edge/80 bg-paper/60 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-ink mb-2">
                  <Layers className="w-4 h-4 text-accent" />
                  <span>{u.breakdown || 'Desglose Técnico de Tokens'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11.5px]">
                  <div className="p-2 rounded-lg bg-sunken/60 border border-edge/50">
                    <span className="text-muted block text-[10.5px]">Tokens Entrada (5h):</span>
                    <strong className="text-ink font-semibold">
                      {(w5.breakdown?.input || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-sunken/60 border border-edge/50">
                    <span className="text-muted block text-[10.5px]">Tokens Salida (5h):</span>
                    <strong className="text-ink font-semibold">
                      {(w5.breakdown?.output || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-sunken/60 border border-edge/50">
                    <span className="text-muted block text-[10.5px]">Tokens Caché Leídos (5h):</span>
                    <strong className="text-slate-400">
                      {(w5.breakdown?.cache || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div className="p-2 rounded-lg bg-sunken/60 border border-edge/50">
                    <span className="text-muted block text-[10.5px]">Tokens Combinados 7d:</span>
                    <strong className="text-accent font-semibold">
                      {(weekly.breakdown?.total || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* CARD 4: Admin Quota Settings Calibration */}
              {isAdmin && (
                <div className="border border-edge rounded-xl overflow-hidden bg-sunken/40">
                  <button
                    onClick={() => setShowConfig((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-accent" />
                      {u.configure || 'Calibrar Límites de Cuota'}
                    </span>
                    {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showConfig && (
                    <form onSubmit={handleSaveConfig} className="p-3.5 border-t border-edge space-y-3 bg-paper/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-muted mb-1">
                            {u.limit5hLabel || 'Límite 5 Horas (Tokens)'}
                          </label>
                          <input
                            type="number"
                            value={limit5hInput}
                            onChange={(e) => setLimit5hInput(e.target.value)}
                            step="100000"
                            min="10000"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-sunken border border-edge text-xs font-mono text-ink focus:outline-none focus:border-accent"
                          />
                          <div className="flex gap-1 mt-1">
                            {[1000000, 5000000, 10000000, 20000000].map((preset) => (
                              <button
                                type="button"
                                key={preset}
                                onClick={() => setLimit5hInput(String(preset))}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sunken hover:bg-edge text-muted hover:text-ink cursor-pointer"
                              >
                                {preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}k`}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-muted mb-1">
                            {u.limitWeeklyLabel || 'Límite Semanal (Tokens)'}
                          </label>
                          <input
                            type="number"
                            value={limitWeeklyInput}
                            onChange={(e) => setLimitWeeklyInput(e.target.value)}
                            step="500000"
                            min="50000"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-sunken border border-edge text-xs font-mono text-ink focus:outline-none focus:border-accent"
                          />
                          <div className="flex gap-1 mt-1">
                            {[10000000, 25000000, 50000000, 100000000].map((preset) => (
                              <button
                                type="button"
                                key={preset}
                                onClick={() => setLimitWeeklyInput(String(preset))}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-sunken hover:bg-edge text-muted hover:text-ink cursor-pointer"
                              >
                                {preset / 1000000}M
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="countCacheCheckbox"
                          checked={countCacheInput}
                          onChange={(e) => setCountCacheInput(e.target.checked)}
                          className="rounded border-edge bg-sunken text-accent focus:ring-accent cursor-pointer"
                        />
                        <label htmlFor="countCacheCheckbox" className="text-xs text-muted cursor-pointer">
                          {u.countCacheLabel || 'Contar tokens leídos de caché en la cuota'}
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        {saveSuccess && (
                          <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Guardado
                          </span>
                        )}
                        <button
                          type="submit"
                          disabled={savingConfig}
                          className="px-3 py-1.5 rounded-lg bg-accent text-slate-950 font-medium text-xs hover:bg-accent/90 transition-colors cursor-pointer"
                        >
                          {savingConfig ? 'Guardando...' : u.save || 'Guardar Límites'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-edge bg-paper/50 flex items-center justify-between text-xs text-muted shrink-0">
              <span className="font-mono text-[11px]">
                {usage?.timestamp ? `Actualizado: ${new Date(usage.timestamp).toLocaleTimeString()}` : ''}
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-sunken hover:bg-edge border border-edge text-ink text-xs font-medium transition-colors cursor-pointer"
              >
                {u.close || 'Cerrar'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
