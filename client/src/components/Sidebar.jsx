import React from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Clock, 
  ChevronRight,
  Sparkles,
  Bot,
  Shield,
  Lock,
  User
} from 'lucide-react';

function formatRelativeTime(dateStr, t) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return t.sidebar.now;
    if (diffMins < 60) return `${diffMins} ${t.sidebar.minAgo}`;
    if (diffHours < 24) return `${diffHours} ${t.sidebar.hourAgo}`;
    if (diffDays === 1) return t.sidebar.yesterday;
    if (diffDays < 7) return `${diffDays} d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
  loading,
  currentUser,
  onOpenLogin,
  t
}) {
  const isAdmin = currentUser?.role === 'admin';
  const st = t.sidebar;

  return (
    <aside className="w-full md:w-72 lg:w-80 flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm h-full">
      {/* Top: New Session Button */}
      <div className="p-3 border-b border-slate-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-medium text-xs shadow-md shadow-teal-500/10 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>{isAdmin ? st.newChatAdmin : st.newChatGuest}</span>
        </button>
      </div>

      {/* Header Info */}
      <div className="px-3 py-2 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/60">
        <span className="flex items-center gap-1.5">
          {isAdmin ? <Bot className="w-3.5 h-3.5 text-emerald-400" /> : <User className="w-3.5 h-3.5 text-teal-400" />}
          <span>{isAdmin ? st.historyAdmin : st.historyGuest}</span>
        </span>
        {isAdmin && (
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            {conversations.length}
          </span>
        )}
      </div>

      {/* Conversations List / Guest Info Box */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {!isAdmin ? (
          <div className="py-6 px-3 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>{st.guestTitle}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {st.guestDesc}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-teal-500/20 text-center space-y-2.5 shadow-sm">
              <Shield className="w-6 h-6 text-teal-400 mx-auto" />
              <p className="text-xs font-bold text-white">{st.isRodrigo}</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {st.isRodrigoDesc}
              </p>
              <button
                onClick={() => onOpenLogin('admin')}
                className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-all shadow-sm"
              >
                {st.loginBtn}
              </button>
            </div>
          </div>
        ) : loading && conversations.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <span>{st.loadingSessions}</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="py-8 px-3 text-center text-xs text-slate-500">
            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            <p className="font-medium text-slate-400">{st.noSessions}</p>
            <p className="text-[11px] mt-1 text-slate-500">{st.noSessionsDesc}</p>
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
                      {conv.title || 'AGy Session'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {conv.preview || 'No preview'}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(conv.lastModified, t)}
                      </span>
                      {conv.stepCount > 0 && (
                        <span>• {conv.stepCount} {st.steps}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete button (hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(st.archiveConfirm)) {
                      onDeleteConversation(conv.id);
                    }
                  }}
                  title="Archive session"
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
        <span className={`flex items-center gap-1 ${isAdmin ? 'text-emerald-400' : 'text-teal-400'}`}>
          <Sparkles className="w-3 h-3" />
          <span>{isAdmin ? 'AGy-cli Daemon' : 'Ask-Rodrigo AI'}</span>
        </span>
        <span className="text-slate-400">{isAdmin ? st.footerRoleAdmin : st.footerRoleGuest}</span>
      </div>
    </aside>
  );
}
