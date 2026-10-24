import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  FolderCode,
  FileText,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { fetchSubagents, fetchUploadsList } from '../services/api.js';

const WORKSPACE_PATHS = {
  normal: '/home/bombi',
  portfolio: '/var/www/my-portfolio',
  preswin: '/var/www/preswin',
  totimigraciones: '/var/www/totimigraciones',
  wiwishop: '/var/www/my-portfolio/public/wiwishop'
};

export function SubagentPanel({
  isOpen,
  onClose,
  activeWorkspace,
  onSelectWorkspace,
  currentUser,
  t
}) {
  const [subagents, setSubagents] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedPath, setCopiedPath] = useState(null);

  const isAdmin = currentUser?.role === 'admin';
  const ts = t.subagents;

  useEffect(() => {
    if (isOpen && isAdmin) {
      loadData();
    }
  }, [isOpen, isAdmin]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [subsRes, uploadsRes] = await Promise.allSettled([
        fetchSubagents(),
        fetchUploadsList()
      ]);

      if (subsRes.status === 'fulfilled' && subsRes.value?.subagents) {
        setSubagents(subsRes.value.subagents);
      }
      if (uploadsRes.status === 'fulfilled' && uploadsRes.value?.files) {
        setUploads(uploadsRes.value.files);
      }
    } catch (err) {
      console.warn('Subagent panel load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <aside
      aria-label="Subagents & Inspector Panel"
      className="relative shrink-0 flex flex-col w-[320px] border-l border-edge bg-paper/95 transition-all duration-200 select-none overflow-hidden"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-edge">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-[8px] bg-accent/10 text-accent">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13.5px] font-semibold text-ink leading-tight">
              {ts.title}
            </h3>
            <p className="text-[10px] text-muted">AGy Dev Workstation</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={loadData}
            disabled={isLoading}
            title="Refresh inspector"
            className="p-1.5 rounded-[8px] text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-accent' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
            title={ts.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Scroller */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 [scrollbar-width:none]">
        {/* Workspace Target (CWD) */}
        <div className="p-3 rounded-[12px] bg-panel border border-edge shadow-v2-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <FolderCode className="w-3.5 h-3.5 text-accent" />
              {ts.workspaceTarget}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono">
              active
            </span>
          </div>

          <div className="p-2 rounded-[8px] bg-sunken border border-edge/60 flex items-center justify-between font-mono text-[11px] text-slate-200">
            <span className="truncate" title={WORKSPACE_PATHS[activeWorkspace] || '/home/bombi'}>
              {WORKSPACE_PATHS[activeWorkspace] || '/home/bombi'}
            </span>
            <button
              onClick={() => handleCopy(WORKSPACE_PATHS[activeWorkspace] || '/home/bombi')}
              className="p-1 text-muted hover:text-accent cursor-pointer"
              title="Copy path"
            >
              {copiedPath === (WORKSPACE_PATHS[activeWorkspace] || '/home/bombi') ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {[
              { id: 'normal', name: 'Normal' },
              { id: 'portfolio', name: 'Portfolio' },
              { id: 'preswin', name: 'PresWin' },
              { id: 'totimigraciones', name: 'TotiMigra' },
              { id: 'wiwishop', name: 'WiwiShop' }
            ].map((ws) => (
              <button
                key={ws.id}
                onClick={() => onSelectWorkspace(ws.id)}
                className={`px-2 py-1.5 rounded-[8px] text-[11px] font-mono transition-all text-left truncate cursor-pointer ${
                  activeWorkspace === ws.id
                    ? 'bg-accent/15 border border-accent/40 text-accent font-semibold shadow-v2-sm'
                    : 'bg-sunken border border-edge/50 text-muted hover:text-ink hover:border-edge'
                }`}
              >
                {ws.name}
              </button>
            ))}
          </div>
        </div>

        {/* Antigravity Subagents */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent" />
              {ts.activeSubagents}
            </span>
            <span className="text-[10px] font-mono text-muted">{subagents.length} catalog</span>
          </div>

          <div className="space-y-1.5">
            {subagents.map((agent) => (
              <div
                key={agent.id}
                className="p-2.5 rounded-[10px] bg-panel border border-edge hover:border-accent/40 transition-colors shadow-v2-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-ink flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {agent.role}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sunken text-accent">
                    {agent.name}
                  </span>
                </div>
                <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                  {agent.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Server Uploaded Files */}
        {isAdmin && (
          <div className="space-y-2 pt-2 border-t border-edge">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                {ts.serverUploads}
              </span>
              <span className="text-[10px] font-mono text-muted">{uploads.length} files</span>
            </div>

            {uploads.length === 0 ? (
              <p className="text-[11px] text-muted/70 italic px-1">{ts.noUploads}</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto [scrollbar-width:none]">
                {uploads.map((f, i) => (
                  <div
                    key={i}
                    onClick={() => handleCopy(f.path)}
                    className="p-2 rounded-[8px] bg-sunken border border-edge/60 hover:border-accent/50 flex items-center justify-between gap-2 cursor-pointer transition-colors group"
                    title={`Click to copy: ${f.path}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11.5px] font-medium text-ink truncate font-mono">
                        {f.name}
                      </p>
                      <p className="text-[10px] text-muted font-mono">{f.size}</p>
                    </div>
                    <span className="text-muted group-hover:text-accent p-1">
                      {copiedPath === f.path ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
