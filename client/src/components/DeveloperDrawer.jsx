import React, { useState, useMemo } from 'react';
import {
  Folder,
  Code2,
  GitPullRequest,
  CheckCircle2,
  Clock,
  GitMerge,
  AlertCircle,
  Plus,
  Search,
  PanelLeftClose,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  GitBranch,
  Filter,
  User,
  MessageSquare
} from 'lucide-react';

export function DeveloperDrawer({
  isOpen,
  onClose,
  projects = [],
  selectedProjectId,
  onSelectProject,
  prs = [],
  onRefreshPRs,
  onCreatePR,
  onUpdatePRStatus,
  canEdit = true
}) {
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'prs'
  const [projectSearch, setProjectSearch] = useState('');
  const [prFilter, setPrFilter] = useState('all'); // 'all' | 'open' | 'in_review' | 'approved' | 'merged'
  const [isCreatePrOpen, setIsCreatePrOpen] = useState(false);
  const [newPrData, setNewPrData] = useState({
    title: '',
    projectId: selectedProjectId || 'portfolio',
    branch: '',
    baseBranch: 'master',
    description: ''
  });

  // Filter projects by query
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects;
    const q = projectSearch.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.path?.toLowerCase().includes(q)
    );
  }, [projects, projectSearch]);

  // Filter PRs by status
  const filteredPRs = useMemo(() => {
    if (prFilter === 'all') return prs;
    return prs.filter((pr) => pr.status === prFilter);
  }, [prs, prFilter]);

  const handleCreatePrSubmit = async (e) => {
    e.preventDefault();
    if (!newPrData.title.trim()) return;
    try {
      await onCreatePR(newPrData);
      setNewPrData({
        title: '',
        projectId: selectedProjectId || 'portfolio',
        branch: '',
        baseBranch: 'master',
        description: ''
      });
      setIsCreatePrOpen(false);
    } catch (err) {
      alert('Error creando PR: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'merged':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <GitMerge className="w-3 h-3" />
            <span>Merged</span>
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>Approved</span>
          </span>
        );
      case 'in_review':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Clock className="w-3 h-3" />
            <span>In Review</span>
          </span>
        );
      case 'open':
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertCircle className="w-3 h-3" />
            <span>Open</span>
          </span>
        );
    }
  };

  const handleSelectProject = (projId) => {
    onSelectProject(projId);
    if (typeof window !== 'undefined' && window.innerWidth < 768 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden animate-fadeIn"
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Developer Workspace Sidebar"
        className={`fixed inset-y-0 left-0 z-40 md:relative md:inset-auto md:z-10 shrink-0 flex flex-col border-r border-edge bg-paper transition-all duration-200 select-none shadow-2xl md:shadow-none ${
          isOpen ? 'w-[85vw] max-w-[320px] md:w-[300px] lg:w-[330px]' : 'w-0 overflow-hidden border-none pointer-events-none md:pointer-events-auto'
        }`}
      >
      {/* Header with Title and Collapse Button */}
      <div className="flex items-center justify-between px-3.5 pt-3 pb-2.5 border-b border-edge/60 bg-panel/40">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-[8px] bg-accent/15 text-accent border border-accent/30 shadow-v2-sm">
            <Code2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[13.5px] font-semibold text-ink leading-tight">Desarrollo</h2>
            <p className="text-[10px] text-muted font-mono leading-none mt-0.5">Workspace & PRs</p>
          </div>
        </div>

        {/* Collapse Sidebar Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-[8px] text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
          title="Ocultar sidebar (Collapse Sidebar)"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Tabs: Proyectos vs PR Reviews */}
      <div className="p-2.5 pb-1 border-b border-edge/40">
        <div className="grid grid-cols-2 p-0.5 rounded-[10px] bg-sunken border border-edge">
          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-panel text-ink shadow-v2-sm font-semibold ring-1 ring-edge'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Proyectos ({projects.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('prs')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'prs'
                ? 'bg-panel text-ink shadow-v2-sm font-semibold ring-1 ring-edge'
                : 'text-muted hover:text-ink'
            }`}
          >
            <GitPullRequest className="w-3.5 h-3.5" />
            <span>PR Reviews ({prs.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Proyectos List */}
      {activeTab === 'projects' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search bar */}
          <div className="p-2.5 pb-2 border-b border-edge/40">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Buscar proyecto..."
                className="w-full pl-8 pr-3 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-ink placeholder:text-muted focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Project Cards List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 [scrollbar-width:thin]">
            {filteredProjects.map((proj) => {
              const isSelected = proj.id === selectedProjectId;
              return (
                <div
                  key={proj.id}
                  onClick={() => handleSelectProject(proj.id)}
                  className={`p-2.5 rounded-[12px] border transition-all cursor-pointer group select-none relative ${
                    isSelected
                      ? 'bg-panel border-accent/50 shadow-v2-sm ring-1 ring-accent/30'
                      : 'bg-panel/40 border-edge hover:bg-panel hover:border-edge/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-[8px] transition-colors ${
                          isSelected
                            ? 'bg-accent text-white shadow-sm'
                            : 'bg-sunken text-muted group-hover:text-ink'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <h4
                          className={`text-xs font-semibold truncate ${
                            isSelected ? 'text-accent' : 'text-ink'
                          }`}
                        >
                          {proj.name}
                        </h4>
                        <p className="text-[10px] text-muted font-mono truncate">{proj.path}</p>
                      </div>
                    </div>

                    {/* Port tag or status */}
                    {proj.port && (
                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded-[6px] bg-sunken text-emerald-400 border border-emerald-500/20">
                        :{proj.port}
                      </span>
                    )}
                  </div>

                  {proj.description && (
                    <p className="text-[11px] text-muted/90 mt-1.5 line-clamp-1">
                      {proj.description}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                    <span className="px-1.5 py-0.5 rounded bg-sunken border border-edge font-mono">
                      {proj.badge || 'Node/JS'}
                    </span>
                    {isSelected && (
                      <span className="text-accent font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        Activo
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProjects.length === 0 && (
              <div className="p-6 text-center text-xs text-muted">
                No se encontraron proyectos con ese criterio.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: PR Reviews */}
      {activeTab === 'prs' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* PR Filter Pills & Create Trigger */}
          <div className="p-2.5 pb-2 border-b border-edge/40 flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none]">
              {['all', 'open', 'in_review', 'approved', 'merged'].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setPrFilter(filterKey)}
                  className={`px-2 py-1 rounded-[6px] text-[10.5px] font-medium transition-colors cursor-pointer capitalize ${
                    prFilter === filterKey
                      ? 'bg-accent text-white font-semibold'
                      : 'bg-sunken text-muted hover:text-ink'
                  }`}
                >
                  {filterKey.replace('_', ' ')}
                </button>
              ))}
            </div>

            {canEdit && (
              <button
                onClick={() => setIsCreatePrOpen(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-[6px] bg-accent/15 text-accent hover:bg-accent hover:text-white border border-accent/30 text-[10.5px] font-semibold transition-all cursor-pointer shrink-0"
                title="Nueva Revisión de Código"
              >
                <Plus className="w-3 h-3" />
                <span>Nueva</span>
              </button>
            )}
          </div>

          {/* PR List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 [scrollbar-width:thin]">
            {filteredPRs.map((pr) => (
              <div
                key={pr.id}
                className="p-2.5 rounded-[12px] bg-panel/60 border border-edge hover:border-accent/40 transition-all select-none space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono font-bold text-accent">{pr.id}</span>
                  {getStatusBadge(pr.status)}
                </div>

                <h4 className="text-xs font-semibold text-ink line-clamp-2 leading-snug">
                  {pr.title}
                </h4>

                <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-muted">
                  <GitBranch className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="truncate max-w-[120px]">{pr.branch}</span>
                  <span>➔</span>
                  <span>{pr.baseBranch || 'master'}</span>
                </div>

                {pr.description && (
                  <p className="text-[10.5px] text-muted line-clamp-2 leading-relaxed">
                    {pr.description}
                  </p>
                )}

                <div className="pt-1 flex items-center justify-between text-[10px] text-muted border-t border-edge/40">
                  <span className="font-mono text-emerald-400">+{pr.diffStats?.additions || 0}</span>
                  <span className="font-mono text-red-400">-{pr.diffStats?.deletions || 0}</span>
                  <span className="truncate max-w-[80px]">{pr.author}</span>

                  {/* Actions to approve or merge */}
                  {canEdit && pr.status !== 'merged' && (
                    <div className="flex items-center gap-1">
                      {pr.status !== 'approved' && (
                        <button
                          onClick={() => onUpdatePRStatus(pr.id, 'approved')}
                          className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[9px] font-semibold transition-colors cursor-pointer"
                          title="Aprobar PR"
                        >
                          Aprobar
                        </button>
                      )}
                      <button
                        onClick={() => onUpdatePRStatus(pr.id, 'merged')}
                        className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-[9px] font-semibold transition-colors cursor-pointer"
                        title="Marcar como Merged"
                      >
                        Merge
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {filteredPRs.length === 0 && (
              <div className="p-6 text-center text-xs text-muted">
                No hay revisiones de código en esta categoría.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Crear Nueva PR Review */}
      {isCreatePrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-[14px] bg-panel border border-edge p-5 shadow-v2-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-accent" />
                <span>Nueva Revisión de Código (PR)</span>
              </h3>
              <button
                onClick={() => setIsCreatePrOpen(false)}
                className="text-muted hover:text-ink cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePrSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">Título de la PR:</label>
                <input
                  type="text"
                  required
                  value={newPrData.title}
                  onChange={(e) => setNewPrData({ ...newPrData, title: e.target.value })}
                  placeholder="ej. feat(auth): add OAuth2 google verification"
                  className="w-full px-2.5 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">Proyecto:</label>
                <select
                  value={newPrData.projectId}
                  onChange={(e) => setNewPrData({ ...newPrData, projectId: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-muted block mb-1">Branch origen:</label>
                  <input
                    type="text"
                    value={newPrData.branch}
                    onChange={(e) => setNewPrData({ ...newPrData, branch: e.target.value })}
                    placeholder="feature/nueva"
                    className="w-full px-2.5 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-ink focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted block mb-1">Base:</label>
                  <input
                    type="text"
                    value={newPrData.baseBranch}
                    onChange={(e) => setNewPrData({ ...newPrData, baseBranch: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">Descripción / Notas:</label>
                <textarea
                  rows={2}
                  value={newPrData.description}
                  onChange={(e) => setNewPrData({ ...newPrData, description: e.target.value })}
                  placeholder="Detalles sobre los cambios realizados..."
                  className="w-full px-2.5 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-ink focus:border-accent focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreatePrOpen(false)}
                  className="px-3 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-muted hover:text-ink cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-[8px] bg-accent text-white text-xs font-semibold hover:bg-accent/90 cursor-pointer shadow-v2-sm"
                >
                  Crear PR Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}
