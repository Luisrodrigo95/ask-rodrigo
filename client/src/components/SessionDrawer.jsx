import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  X,
  Trash2,
  Clock,
  Sparkles,
  Shield,
  MessageSquare,
  AlertCircle,
  CheckSquare,
  Square,
  Archive,
  ArchiveRestore,
  ListChecks,
  Check,
  RotateCw
} from 'lucide-react';

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isYesterday(date, now) {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return isSameDay(date, yesterday);
}

export const SessionDrawer = React.memo(function SessionDrawer({
  conversations,
  activeId,
  generatingMap = {},
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onBatchDeleteConversations,
  onBatchArchiveConversations,
  onRefreshChats,
  isRefreshing = false,
  loading,
  currentUser,
  onOpenLogin,
  isDrawerOpen = true,
  onCloseDrawer,
  t
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'active' | 'questions' | 'archived'
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';
  const td = t.drawer;
  const ts = t.sidebar;

  // Filter conversations by search, tab and archive status
  const filteredConversations = useMemo(() => {
    if (!conversations || !Array.isArray(conversations)) return [];

    let list = [...conversations];

    // Filter by archive status & questions
    if (activeFilter === 'archived') {
      list = list.filter((c) => Boolean(c.archived));
    } else if (activeFilter === 'questions') {
      list = list.filter((c) => !c.archived && (
        (c.title || '').includes('?') || (c.title || '').includes('¿') ||
        (c.snippet || '').includes('?') || (c.snippet || '').includes('¿') ||
        (c.preview || '').includes('?') || (c.preview || '').includes('¿')
      ));
    } else if (activeFilter === 'active') {
      list = list.filter((c) => !c.archived);
    } else {
      // 'all': Default to showing active non-archived conversations to keep drawer uncluttered
      list = list.filter((c) => !c.archived);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((conv) => {
        const title = (conv.title || conv.id || '').toLowerCase();
        const snippet = (conv.snippet || conv.preview || conv.lastMessage || '').toLowerCase();
        return title.includes(q) || snippet.includes(q);
      });
    }

    return list;
  }, [conversations, searchQuery, activeFilter]);

  // Group by Date: Today, Yesterday, Older
  const groupedConversations = useMemo(() => {
    const today = [];
    const yesterday = [];
    const older = [];
    const now = new Date();

    filteredConversations.forEach((conv) => {
      const rawDate = conv.updatedAt || conv.lastModified || conv.createdAt || conv.timestamp;
      const convDate = rawDate ? new Date(rawDate) : new Date();

      if (isNaN(convDate.getTime())) {
        today.push(conv);
      } else if (isSameDay(convDate, now)) {
        today.push(conv);
      } else if (isYesterday(convDate, now)) {
        yesterday.push(conv);
      } else {
        older.push(conv);
      }
    });

    return [
      { key: 'today', label: td.today, items: today },
      { key: 'yesterday', label: td.yesterday, items: yesterday },
      { key: 'older', label: td.older, items: older }
    ].filter((group) => group.items.length > 0);
  }, [filteredConversations, td]);

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMs / 3600000);

      if (diffMin < 1) return ts.now;
      if (diffMin < 60) return `${diffMin}${ts.minAgo}`;
      if (diffHour < 24) return `${diffHour}${ts.hourAgo}`;
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch {
      return '';
    }
  };

  const handleSelectConv = (convId) => {
    onSelectConversation(convId);
    if (typeof window !== 'undefined' && window.innerWidth < 768 && onCloseDrawer) {
      onCloseDrawer();
    }
  };

  const handleCreateNew = () => {
    onNewChat();
    if (typeof window !== 'undefined' && window.innerWidth < 768 && onCloseDrawer) {
      onCloseDrawer();
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => {
      const next = !prev;
      if (!next) {
        setSelectedIds(new Set());
      }
      return next;
    });
  };

  const toggleSelectItem = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredConversations.length && filteredConversations.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConversations.map((c) => c.id)));
    }
  };

  const handleBatchArchive = async () => {
    if (selectedIds.size === 0 || !onBatchArchiveConversations) return;
    setIsArchiving(true);
    try {
      const idsArray = Array.from(selectedIds);
      const shouldArchive = activeFilter !== 'archived';
      await onBatchArchiveConversations(idsArray, shouldArchive);
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0 || !onBatchDeleteConversations) return;
    const count = selectedIds.size;
    const confirmMsg = (td.confirmBatchDelete || '¿Estás seguro de eliminar las {count} conversaciones seleccionadas? Esta acción no se puede deshacer.').replace('{count}', count);
    if (window.confirm(confirmMsg)) {
      setIsDeleting(true);
      try {
        const idsArray = Array.from(selectedIds);
        await onBatchDeleteConversations(idsArray);
        setSelectedIds(new Set());
        setIsSelectMode(false);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleSingleArchive = async (e, conv) => {
    e.stopPropagation();
    if (!onBatchArchiveConversations) return;
    const targetState = !conv.archived;
    await onBatchArchiveConversations([conv.id], targetState);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isDrawerOpen && (
        <div
          onClick={onCloseDrawer}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-fadeIn"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Session Drawer"
        className={`fixed inset-y-0 left-0 z-50 md:relative md:inset-auto md:z-10 shrink-0 flex flex-col border-r border-edge bg-paper transition-all duration-200 select-none shadow-2xl md:shadow-none safe-top safe-bottom ${
          isDrawerOpen
            ? 'w-[85vw] max-w-[320px] md:w-[300px] lg:w-[340px]'
            : 'w-0 overflow-hidden border-none pointer-events-none md:pointer-events-auto'
        }`}
      >
        {/* Header with Title, Multi-select Button, + New Button and Mobile Close */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-edge/60">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink">{td.title}</h2>
            {isAdmin && conversations.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-sunken text-muted font-medium">
                {filteredConversations.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && onRefreshChats && (
              <button
                type="button"
                onClick={onRefreshChats}
                disabled={loading || isRefreshing}
                className="p-1.5 rounded-[8px] bg-sunken border border-edge text-muted hover:text-ink hover:border-accent/40 disabled:opacity-50 transition-all cursor-pointer shadow-v2-sm"
                title={td.refreshChatsTooltip || td.refreshChats || 'Refrescar chats'}
                aria-label={td.refreshChats || 'Refrescar chats'}
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? 'animate-spin text-accent' : ''}`} />
              </button>
            )}

            {isAdmin && conversations.length > 0 && (
              <button
                onClick={toggleSelectMode}
                className={`p-1.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
                  isSelectMode
                    ? 'bg-accent text-white shadow-v2-sm'
                    : 'bg-sunken border border-edge text-muted hover:text-ink hover:border-accent/40'
                }`}
                title={isSelectMode ? (td.cancelSelect || 'Cancel multi-select') : (td.batchSelectTitle || 'Select multiple chats')}
                aria-label={td.batchSelectTitle || 'Select multiple chats'}
              >
                <ListChecks className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-accent text-white font-medium text-xs hover:bg-accent/90 transition-all shadow-v2-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{td.newChat}</span>
            </button>
            {onCloseDrawer && (
              <button
                onClick={onCloseDrawer}
                className="p-1.5 rounded-[8px] text-muted hover:text-ink hover:bg-sunken md:hidden cursor-pointer transition-colors"
                title={td.closeDrawer || 'Close'}
                aria-label={td.closeDrawer || 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Batch Selection Action Bar (Visible when in select mode) */}
        {isSelectMode && (
          <div className="p-2.5 bg-panel border-b border-edge/80 flex flex-col gap-2 animate-fadeIn shadow-xs">
            <div className="flex items-center justify-between">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline cursor-pointer"
              >
                {selectedIds.size === filteredConversations.length && filteredConversations.length > 0 ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{td.deselectAll || 'Deseleccionar'}</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-muted" />
                    <span>{td.selectAll || 'Seleccionar todos'} ({filteredConversations.length})</span>
                  </>
                )}
              </button>
              <span className="text-[11px] font-mono text-muted bg-sunken px-2 py-0.5 rounded-full border border-edge">
                {selectedIds.size} {td.selectedCount || 'seleccionados'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={handleBatchArchive}
                disabled={selectedIds.size === 0 || isArchiving}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs font-medium text-ink hover:text-accent hover:border-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-v2-sm"
                title={activeFilter === 'archived' ? 'Desarchivar seleccionados' : 'Archivar seleccionados'}
              >
                {activeFilter === 'archived' ? (
                  <>
                    <ArchiveRestore className="w-3.5 h-3.5 text-sky-400" />
                    <span>{td.unarchiveSelected || 'Desarchivar'}</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5 text-amber-400" />
                    <span>{td.archiveSelected || 'Archivar'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleBatchDelete}
                disabled={selectedIds.size === 0 || isDeleting}
                className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-v2-sm"
                title={td.deleteSelected || 'Delete selected'}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{td.deleteSelected || 'Delete'}</span>
              </button>

              <button
                onClick={toggleSelectMode}
                className="p-1.5 rounded-[8px] text-muted hover:text-ink hover:bg-sunken border border-edge transition-colors cursor-pointer"
                title={td.cancel || 'Cancelar'}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Search Input Box */}
        <div className="p-3 border-b border-edge/40">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={td.searchPlaceholder}
              className="w-full bg-sunken border border-edge/70 rounded-[10px] pl-8 pr-7 py-1.5 text-xs text-ink placeholder-muted/70 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-1 text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto [scrollbar-width:none]">
            {[
              { id: 'all', label: td.filterAll },
              { id: 'active', label: td.filterActive },
              { id: 'questions', label: td.filterQuestions },
              { id: 'archived', label: td.filterArchived }
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => {
                  setActiveFilter(pill.id);
                  setSelectedIds(new Set());
                }}
                className={`px-2.5 py-1 rounded-[8px] text-[11.5px] font-medium transition-colors cursor-pointer shrink-0 ${
                  activeFilter === pill.id
                    ? 'bg-panel text-ink shadow-v2-sm ring-1 ring-edge font-semibold'
                    : 'text-muted hover:text-ink hover:bg-sunken'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Session List with Date Grouping */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4 [scrollbar-width:none]">
          {/* Guest Mode Informational Card */}
          {!isAdmin && (
            <div className="p-3.5 rounded-[12px] bg-panel border border-edge shadow-v2-sm space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{ts.guestTitle}</span>
              </div>
              <p className="text-[11.5px] text-muted leading-relaxed">
                {ts.guestDesc}
              </p>
              <div className="pt-2 border-t border-edge flex items-center justify-between">
                <span className="text-[10.5px] text-muted flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-400" /> Safe guest isolation
                </span>
                <button
                  onClick={onOpenLogin}
                  className="text-[11px] text-accent hover:underline font-medium cursor-pointer"
                >
                  {ts.loginBtn}
                </button>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="text-center py-6 text-xs text-muted flex items-center justify-center gap-2 font-mono">
              <Clock className="w-3.5 h-3.5 animate-spin text-accent" />
              <span>{ts.loadingSessions}</span>
            </div>
          )}

          {/* Empty States */}
          {!loading && isAdmin && filteredConversations.length === 0 && (
            <div className="text-center py-8 px-4 text-xs text-muted space-y-1">
              <MessageSquare className="w-6 h-6 mx-auto text-muted/50 mb-1" />
              <p className="font-medium text-ink">{ts.noSessions}</p>
              <p className="text-[11px]">{ts.noSessionsDesc}</p>
            </div>
          )}

          {/* Date Grouped Sessions */}
          {isAdmin &&
            groupedConversations.map((group) => (
              <div key={group.key} className="space-y-1">
                <div className="px-2 pt-1 pb-0.5 text-[11px] font-semibold tracking-wider uppercase text-muted/70">
                  {group.label}
                </div>
                <div className="space-y-1">
                  {group.items.map((conv) => {
                    const isActive = conv.id === activeId;
                    const isSelected = selectedIds.has(conv.id);
                    const defaultTitle = td.newChatTitle || (td.today === 'Hoy' ? 'Nuevo chat' : 'New chat');
                    const displayTitle = conv.title || (conv.isDraft ? defaultTitle : `Session ${conv.id?.slice(0, 8)}`);
                    const defaultNoPreview = td.noPreview || (td.today === 'Hoy' ? 'Sin vista previa' : 'No preview available');
                    const displaySnippet = conv.snippet || conv.preview || conv.lastMessage || defaultNoPreview;
                    const displayTime = formatRelativeTime(conv.updatedAt || conv.lastModified || conv.createdAt);

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          if (isSelectMode) {
                            toggleSelectItem(conv.id);
                          } else {
                            handleSelectConv(conv.id);
                          }
                        }}
                        className={`group relative flex items-start gap-2 p-2.5 rounded-[10px] text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-accent/10 border border-accent/40 text-ink shadow-v2-sm ring-1 ring-accent/30'
                            : isActive
                            ? 'bg-panel ring-1 ring-edge shadow-v2-sm text-ink'
                            : 'hover:bg-sunken text-ink/80 hover:text-ink'
                        }`}
                      >
                        {/* Checkbox when in select mode */}
                        {isSelectMode && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectItem(conv.id);
                            }}
                            className="mt-0.5 shrink-0 cursor-pointer"
                          >
                            {isSelected ? (
                              <div className="w-4 h-4 rounded bg-accent text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded border border-edge/80 bg-sunken hover:border-accent/60" />
                            )}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {!isSelectMode && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    generatingMap?.[conv.id]
                                      ? 'bg-amber-400 animate-ping'
                                      : isActive
                                      ? 'bg-accent'
                                      : 'bg-muted/40'
                                  }`}
                                />
                              )}
                              <span className="truncate text-[12.5px] font-medium text-ink">
                                {displayTitle}
                              </span>
                              {generatingMap?.[conv.id] && (
                                <span className="flex items-center gap-1 text-[9.5px] font-semibold text-accent bg-accent/15 px-1.5 py-0.2 rounded-full border border-accent/30 animate-pulse shrink-0">
                                  <Sparkles className="w-2.5 h-2.5 animate-spin" />
                                  <span className="hidden sm:inline">{td.running || (t.chat?.generatingBtn || 'Running...')}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-muted shrink-0">
                              {displayTime}
                            </span>
                          </div>

                          <p className="text-[11.5px] text-muted line-clamp-1 truncate pr-12">
                            {displaySnippet}
                          </p>
                        </div>

                        {/* Action buttons (Archive & Delete) visible on hover when not in select mode */}
                        {!isSelectMode && (
                          <div className="absolute right-2 bottom-2 flex items-center gap-1 opacity-70 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            {/* Single Archive/Unarchive button */}
                            <button
                              onClick={(e) => handleSingleArchive(e, conv)}
                              title={conv.archived ? (td.unarchiveSelected || 'Desarchivar') : (td.archiveSelected || 'Archivar')}
                              className="p-1 text-muted/60 hover:text-accent rounded hover:bg-sunken cursor-pointer transition-colors"
                            >
                              {conv.archived ? (
                                <ArchiveRestore className="w-3.5 h-3.5" />
                              ) : (
                                <Archive className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete Conversation Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(ts.archiveConfirm)) {
                                  onDeleteConversation(conv.id);
                                }
                              }}
                              title={ts.archiveConfirm}
                              className="p-1 text-muted/60 hover:text-rose-400 rounded hover:bg-rose-500/10 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </aside>
    </>
  );
});

