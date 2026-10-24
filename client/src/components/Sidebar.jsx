import React from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Clock, 
  ChevronRight,
  Sparkles,
  Bot
} from 'lucide-react';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return 'Ahora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `${diffDays} d`;
    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  loading
}) {
  return (
    <aside className="w-full md:w-72 lg:w-80 flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm h-full">
      {/* Top: New Session Button */}
      <div className="p-3 border-b border-slate-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-medium text-xs shadow-md shadow-teal-500/10 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Sesión AGy</span>
        </button>
      </div>

      {/* Header Info */}
      <div className="px-3 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/60">
        <span className="flex items-center gap-1.5">
          <Bot className="w-3.5 h-3.5 text-teal-400" />
          <span>Historial de Sesiones</span>
        </span>
        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
          {conversations.length}
        </span>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && conversations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Cargando sesiones...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-8 px-3 text-center text-xs text-slate-500">
            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="font-medium text-slate-400">Sin sesiones previas</p>
            <p className="text-[11px] mt-1 text-slate-500">Inicia una nueva consulta para comenzar un hilo con Antigravity CLI.</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isSelected = conv.id === activeId;
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-slate-800/90 border-teal-500/50 shadow-sm shadow-teal-500/5 text-white'
                    : 'border-transparent text-slate-300 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className={`mt-0.5 p-1 rounded-lg ${isSelected ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400 group-hover:text-teal-400'}`}>
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate leading-tight">
                      {conv.title || 'Consulta AGy'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {conv.preview || 'Sin vista previa'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(conv.lastModified)}
                      </span>
                      {conv.stepCount > 0 && (
                        <span>• {conv.stepCount} pasos</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button (hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('¿Deseas archivar esta conversación?')) {
                      onDeleteConversation(conv.id);
                    }
                  }}
                  title="Archivar conversación"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 transition-all ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1 text-teal-400/80">
          <Sparkles className="w-3 h-3" />
          <span>AGy-cli Daemon</span>
        </span>
        <span className="text-slate-400">VPS-Rodrigo</span>
      </div>
    </aside>
  );
}
