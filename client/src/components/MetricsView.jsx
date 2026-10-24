import React from 'react';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity,
  Zap,
  ShieldCheck
} from 'lucide-react';

export function MetricsView({ metrics, loading, onRefresh }) {
  if (!metrics && loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono">Consultando métricas en vivo del VPS...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400">
        <p className="text-xs">No se pudieron cargar las métricas.</p>
        <button
          onClick={onRefresh}
          className="mt-3 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { os, cpu, memory, disk, services = [], pm2Processes = [] } = metrics;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400" />
            <span>Monitor de Infraestructura VPS</span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {os.hostname} ({os.distro}) • Uptime: {os.uptimeHours} horas
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CPU Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-teal-400" />
              <span>Procesador CPU</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-teal-300">
              {cpu.cores} Cores
            </span>
          </div>

          <div>
            <div className="text-xl font-bold font-mono text-white">
              Carga: {cpu.loadavg['1m']}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate" title={cpu.model}>
              {cpu.model}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Promedios:</span>
            <span>1m: {cpu.loadavg['1m']} | 5m: {cpu.loadavg['5m']} | 15m: {cpu.loadavg['15m']}</span>
          </div>
        </div>

        {/* Memory Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Memoria RAM</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
              {memory.usedPercent}% en uso
            </span>
          </div>

          <div>
            <div className="text-xl font-bold font-mono text-white">
              {memory.usedMb} / {memory.totalMb} MB
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  memory.usedPercent > 85 ? 'bg-rose-500' : memory.usedPercent > 70 ? 'bg-amber-400' : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(100, memory.usedPercent)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Disponible:</span>
            <span className="text-emerald-400">{memory.freeMb} MB libres</span>
          </div>
        </div>

        {/* Disk Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Disco SSD (NVMe)</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-300">
              {disk.percent} ocupado
            </span>
          </div>

          <div>
            <div className="text-xl font-bold font-mono text-white">
              {disk.usedGb} / {disk.totalGb} GB
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: disk.percent }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Espacio libre:</span>
            <span className="text-emerald-400">{disk.freeGb} GB libres</span>
          </div>
        </div>
      </div>

      {/* Systemd Services Section */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Servicios del Sistema (systemd)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {services.map((svc) => (
            <div
              key={svc.name}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-semibold text-white">{svc.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{svc.label}</p>
              </div>
              <span
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium ${
                  svc.ok
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {svc.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{svc.status}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* PM2 Applications Section */}
      {pm2Processes.length > 0 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Aplicaciones en Producción (PM2)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2">ID</th>
                  <th className="pb-2">Nombre</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2">CPU</th>
                  <th className="pb-2">Memoria</th>
                  <th className="pb-2">Reinicios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pm2Processes.map((p) => (
                  <tr key={p.id} className="text-slate-300">
                    <td className="py-2.5 text-slate-500">{p.id}</td>
                    <td className="py-2.5 font-semibold text-white">{p.name}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5">{p.cpu}%</td>
                    <td className="py-2.5">{p.memoryMb} MB</td>
                    <td className="py-2.5 text-slate-400">{p.restarts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
