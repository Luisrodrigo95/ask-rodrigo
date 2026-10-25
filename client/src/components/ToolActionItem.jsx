import React, { useState } from 'react';
import {
  Terminal,
  FileText,
  FileCode,
  Search,
  Wrench,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

function getToolMeta(toolName, parameters = {}) {
  const name = (toolName || '').toLowerCase();
  
  if (name.includes('command') || name === 'bash' || name === 'run_command') {
    const cmd = parameters.CommandLine || parameters.command || parameters.cmd || '';
    return {
      type: 'command',
      icon: Terminal,
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      label: 'bash',
      summary: cmd ? `$ ${cmd}` : 'run_command'
    };
  }

  if (name.includes('view') || name.includes('read')) {
    const filePath = parameters.AbsolutePath || parameters.Path || parameters.path || parameters.file || '';
    const filename = filePath ? filePath.split('/').pop() : 'archivo';
    return {
      type: 'read',
      icon: FileText,
      color: 'text-sky-400',
      badgeBg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
      label: 'read',
      summary: `Leer: ${filename}`
    };
  }

  if (name.includes('write') || name.includes('edit') || name.includes('replace') || name.includes('sed')) {
    const filePath = parameters.TargetFile || parameters.Path || parameters.path || parameters.file || '';
    const filename = filePath ? filePath.split('/').pop() : 'archivo';
    return {
      type: 'write',
      icon: FileCode,
      color: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      label: 'edit',
      summary: `Modificar: ${filename}`
    };
  }

  if (name.includes('search') || name.includes('grep') || name.includes('find')) {
    const query = parameters.query || parameters.pattern || parameters.search || '';
    return {
      type: 'search',
      icon: Search,
      color: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
      label: 'search',
      summary: query ? `Buscar: "${query}"` : 'Búsqueda'
    };
  }

  return {
    type: 'tool',
    icon: Wrench,
    color: 'text-teal-400',
    badgeBg: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
    label: toolName || 'tool',
    summary: toolName ? `${toolName}(...)` : 'Acción de herramienta'
  };
}

export function ToolActionItem({ tool, ct = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  if (!tool) return null;

  const toolName = tool.toolName || (tool.toolInfo && tool.toolInfo.name) || 'tool';
  const parameters = tool.parameters || (tool.toolInfo && tool.toolInfo.parameters) || {};
  const output = tool.output !== undefined ? tool.output : (tool.toolInfo && tool.toolInfo.output);
  const isRunning = tool.state === 'ACTIVE' || tool.status === 'RUNNING';
  const isDone = !isRunning;

  const meta = getToolMeta(toolName, parameters);
  const Icon = meta.icon;

  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return null;
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    return `${seconds.toFixed(2)}s`;
  };

  const handleCopy = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(typeof text === 'string' ? text : JSON.stringify(text, null, 2));
    if (type === 'cmd') {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } else {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  const commandString = parameters.CommandLine || parameters.command || parameters.cmd || null;

  return (
    <div className="w-full min-w-0 rounded-[12px] bg-sunken/90 border border-edge/80 hover:border-accent/40 transition-all overflow-hidden my-1 shadow-xs">
      {/* Collapsed Single Line Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full text-left px-3 py-2 flex items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-panel/40 transition-colors"
        title="Clic para expandir comando e información"
      >
        {/* Left: Icon, Badge, and Summary Line */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="shrink-0 flex items-center justify-center">
            {isRunning ? (
              <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
            ) : (
              <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
            )}
          </div>

          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border shrink-0 ${meta.badgeBg}`}>
            {meta.label}
          </span>

          <span className="font-mono text-xs text-ink/90 truncate font-medium">
            {meta.summary}
          </span>
        </div>

        {/* Right: Duration, Status, Chevron */}
        <div className="flex items-center gap-2 shrink-0 text-muted text-[11px] font-mono">
          {tool.duration !== undefined && (
            <span className="flex items-center gap-1 text-[10.5px] text-muted/80">
              <Clock className="w-3 h-3 text-muted/60" />
              {formatDuration(tool.duration)}
            </span>
          )}

          {isRunning ? (
            <span className="flex items-center gap-1 text-accent text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
              <span className="hidden sm:inline">{ct.toolExecuting || 'Ejecutando...'}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          )}

          <div className="text-muted/60 hover:text-ink transition-colors p-0.5">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Details Pane */}
      {isOpen && (
        <div className="border-t border-edge/60 bg-black/40 p-3 space-y-3 text-xs font-mono animate-fadeIn">
          {/* Section 1: Command / Parameters */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-muted text-[11px]">
              <span className="font-semibold text-slate-300">
                {commandString ? (ct.toolCommand || 'Comando:') : (ct.toolParameters || 'Parámetros:')}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(commandString || JSON.stringify(parameters, null, 2), 'cmd')}
                className="flex items-center gap-1 text-[10.5px] hover:text-ink transition-colors px-1.5 py-0.5 rounded bg-sunken border border-edge/60 cursor-pointer"
                title={ct.copyCommand || 'Copiar comando'}
              >
                {copiedCmd ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">{ct.copied || 'Copiado!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{ct.copyCommand || 'Copiar'}</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-2.5 rounded-lg bg-black/70 border border-white/10 text-emerald-300 overflow-x-auto text-[11.5px] leading-relaxed whitespace-pre-wrap break-all max-h-56 [scrollbar-width:thin]">
              {commandString || JSON.stringify(parameters, null, 2)}
            </pre>
          </div>

          {/* Section 2: Output / Result */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-muted text-[11px]">
              <span className="font-semibold text-slate-300">
                {ct.toolOutput || 'Resultado / Salida:'}
              </span>
              {output && (
                <button
                  type="button"
                  onClick={() => handleCopy(output, 'output')}
                  className="flex items-center gap-1 text-[10.5px] hover:text-ink transition-colors px-1.5 py-0.5 rounded bg-sunken border border-edge/60 cursor-pointer"
                  title={ct.copyOutput || 'Copiar resultado'}
                >
                  {copiedOutput ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">{ct.copied || 'Copiado!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>{ct.copyOutput || 'Copiar'}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {isRunning && !output ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-black/50 border border-edge text-accent text-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{ct.toolExecuting || 'Ejecutando en el servidor en tiempo real...'}</span>
              </div>
            ) : output ? (
              <pre className="p-2.5 rounded-lg bg-black/70 border border-white/10 text-slate-300 overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap break-all max-h-64 [scrollbar-width:thin]">
                {output}
              </pre>
            ) : (
              <div className="p-2.5 rounded-lg bg-black/30 border border-edge/40 text-muted/60 text-[11px] italic">
                {ct.toolNoOutput || '(Sin salida o completado silenciosamente)'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
