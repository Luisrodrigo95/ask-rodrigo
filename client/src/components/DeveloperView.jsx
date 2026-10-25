import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import {
  Folder,
  FolderOpen,
  File,
  FileCode,
  FileText,
  UploadCloud,
  Plus,
  Trash2,
  Edit3,
  Save,
  RefreshCw,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  AlertCircle,
  ShieldCheck,
  Eye,
  Code2,
  FileJson,
  FileType,
  Terminal,
  FolderPlus,
  FilePlus,
  Lock,
  ExternalLink,
  Key,
  Copy,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  fetchDeveloperProjects,
  fetchDeveloperTree,
  fetchDeveloperFile,
  saveDeveloperFile,
  createDeveloperItem,
  deleteDeveloperItem,
  renameDeveloperItem,
  uploadDeveloperFiles
} from '../services/api.js';

// Language resolver based on extension
function getLanguageFromExtension(filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'js':
    case 'mjs':
    case 'cjs':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'html':
    case 'ejs':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'json':
      return 'json';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'py':
      return 'python';
    case 'php':
      return 'php';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'sql':
      return 'sql';
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'xml':
    case 'svg':
      return 'xml';
    default:
      return 'plaintext';
  }
}

// Icon resolver for files
function getFileIcon(name = '', isDirectory = false, isExpanded = false) {
  if (isDirectory) {
    return isExpanded ? (
      <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
    ) : (
      <Folder className="w-4 h-4 text-amber-400/80 shrink-0" />
    );
  }

  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return <FileCode className="w-4 h-4 text-yellow-400 shrink-0" />;
    case 'ts':
    case 'tsx':
      return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
    case 'json':
      return <FileJson className="w-4 h-4 text-emerald-400 shrink-0" />;
    case 'css':
    case 'scss':
      return <FileType className="w-4 h-4 text-cyan-400 shrink-0" />;
    case 'html':
    case 'ejs':
      return <FileCode className="w-4 h-4 text-orange-400 shrink-0" />;
    case 'md':
      return <FileText className="w-4 h-4 text-indigo-400 shrink-0" />;
    case 'py':
      return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
    case 'sh':
      return <Terminal className="w-4 h-4 text-emerald-300 shrink-0" />;
    default:
      return <File className="w-4 h-4 text-muted shrink-0" />;
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function DeveloperView({ currentUser, t }) {
  // Permission logic
  const isOwner = Boolean(
    currentUser?.isOwner ||
    currentUser?.email === 'lg2012garcia@gmail.com' ||
    currentUser?.email === 'contacto@therodrigo.com'
  );
  const canEdit = Boolean(isOwner || currentUser?.canEditProjects);

  // View Mode: 'vscode' (Full VS Code with Extensions & Terminal) vs 'monaco' (Lightweight Native Editor)
  const [viewMode, setViewMode] = useState(canEdit ? 'vscode' : 'monaco');
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [copiedKey, setCopiedKey] = useState(false);

  // Projects state
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('portfolio');
  const [tree, setTree] = useState([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState({});

  // Editor Tabs state: [{ path, name, content, initialContent, isDirty, language, isBinary }]
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabPath, setActiveTabPath] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [editorCursorInfo, setEditorCursorInfo] = useState({ line: 1, col: 1 });

  // Modals & User actions
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: null, // 'create-file' | 'create-folder' | 'delete' | 'rename'
    targetItem: null,
    inputValue: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText('RodrigoDev2026!');
    setCopiedKey(true);
    showToast('Clave de acceso copiada al portapapeles: RodrigoDev2026!', 'success');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // 1. Load Projects on Mount
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await fetchDeveloperProjects();
        const list = res.projects || [];
        setProjects(list);
        if (list.length > 0 && !list.some((p) => p.id === selectedProjectId)) {
          setSelectedProjectId(list[0].id);
        }
      } catch (err) {
        showToast('Error cargando proyectos: ' + err.message, 'error');
      }
    };
    loadProjects();
  }, []);

  // 2. Load File Tree when selected project changes
  const loadTree = useCallback(async (projId) => {
    if (!projId) return;
    setTreeLoading(true);
    try {
      const res = await fetchDeveloperTree(projId);
      setTree(res.tree || []);
      const initialExpanded = {};
      (res.tree || []).forEach((item) => {
        if (item.isDirectory && !item.isIgnored) {
          initialExpanded[item.relativePath] = true;
        }
      });
      setExpandedFolders((prev) => ({ ...initialExpanded, ...prev }));
    } catch (err) {
      showToast('Error cargando árbol de archivos: ' + err.message, 'error');
    } finally {
      setTreeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadTree(selectedProjectId);
      setOpenTabs([]);
      setActiveTabPath(null);
      setIframeKey(Date.now());
    }
  }, [selectedProjectId, loadTree]);

  // Toggle Folder expansion
  const toggleFolder = (folderPath) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  // Open file in Editor (Monaco mode)
  const handleOpenFile = async (fileItem) => {
    if (fileItem.isDirectory) {
      toggleFolder(fileItem.relativePath);
      return;
    }

    const existing = openTabs.find((t) => t.path === fileItem.relativePath);
    if (existing) {
      setActiveTabPath(fileItem.relativePath);
      return;
    }

    setFileLoading(true);
    try {
      const res = await fetchDeveloperFile(selectedProjectId, fileItem.relativePath);
      const newTab = {
        path: res.relativePath,
        name: res.name,
        content: res.isBinary ? '' : (res.content || ''),
        initialContent: res.isBinary ? '' : (res.content || ''),
        isDirty: false,
        isBinary: Boolean(res.isBinary),
        size: res.size,
        language: getLanguageFromExtension(res.name)
      };

      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabPath(res.relativePath);
    } catch (err) {
      showToast('Error al abrir archivo: ' + err.message, 'error');
    } finally {
      setFileLoading(false);
    }
  };

  // Close Tab
  const handleCloseTab = (e, path) => {
    e.stopPropagation();
    const tabToClose = openTabs.find((t) => t.path === path);
    if (tabToClose?.isDirty) {
      if (!window.confirm(`El archivo "${tabToClose.name}" tiene cambios no guardados. ¿Deseas cerrarlo?`)) {
        return;
      }
    }

    const nextTabs = openTabs.filter((t) => t.path !== path);
    setOpenTabs(nextTabs);
    if (activeTabPath === path) {
      setActiveTabPath(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1].path : null);
    }
  };

  const currentTab = openTabs.find((t) => t.path === activeTabPath);

  const handleEditorChange = (value) => {
    if (!currentTab || currentTab.isBinary) return;
    const isDirty = value !== currentTab.initialContent;
    setOpenTabs((prev) =>
      prev.map((t) => (t.path === currentTab.path ? { ...t, content: value, isDirty } : t))
    );
  };

  const handleSaveFile = async () => {
    if (!currentTab || !canEdit || currentTab.isBinary || !currentTab.isDirty) return;
    setIsSaving(true);
    try {
      await saveDeveloperFile(selectedProjectId, currentTab.path, currentTab.content);
      setOpenTabs((prev) =>
        prev.map((t) =>
          t.path === currentTab.path ? { ...t, initialContent: t.content, isDirty: false } : t
        )
      );
      showToast(`Guardado: ${currentTab.name}`, 'success');
    } catch (err) {
      showToast(`Error al guardar: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode === 'monaco' && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTab, canEdit, viewMode]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      setEditorCursorInfo({
        line: e.position.lineNumber,
        col: e.position.column
      });
    });
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !canEdit) return;

    setIsUploading(true);
    try {
      const res = await uploadDeveloperFiles(selectedProjectId, '', files);
      showToast(res.message || `${files.length} archivo(s) subido(s) con éxito.`, 'success');
      loadTree(selectedProjectId);
    } catch (err) {
      showToast('Error en subida: ' + err.message, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const { type, targetItem, inputValue } = modalState;

    try {
      if (type === 'create-file' || type === 'create-folder') {
        if (!inputValue.trim()) return;
        const parentPath = targetItem?.isDirectory ? targetItem.relativePath : '';
        await createDeveloperItem(
          selectedProjectId,
          parentPath,
          inputValue.trim(),
          type === 'create-folder' ? 'folder' : 'file'
        );
        showToast(`Creado con éxito: ${inputValue.trim()}`, 'success');
        loadTree(selectedProjectId);
      } else if (type === 'delete') {
        if (!targetItem) return;
        await deleteDeveloperItem(selectedProjectId, targetItem.relativePath);
        showToast(`Eliminado: ${targetItem.name}`, 'success');
        setOpenTabs((prev) => prev.filter((t) => t.path !== targetItem.relativePath));
        if (activeTabPath === targetItem.relativePath) {
          setActiveTabPath(null);
        }
        loadTree(selectedProjectId);
      } else if (type === 'rename') {
        if (!targetItem || !inputValue.trim() || inputValue.trim() === targetItem.name) return;
        await renameDeveloperItem(selectedProjectId, targetItem.relativePath, inputValue.trim());
        showToast(`Renombrado a: ${inputValue.trim()}`, 'success');
        loadTree(selectedProjectId);
      }
      setModalState({ isOpen: false, type: null, targetItem: null, inputValue: '' });
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const renderTreeNodes = (nodes, depth = 0) => {
    if (!nodes || nodes.length === 0) return null;

    return nodes.map((node) => {
      if (filterQuery) {
        const matchesName = node.name.toLowerCase().includes(filterQuery.toLowerCase());
        const matchesChild =
          node.isDirectory &&
          node.children?.some((c) => c.name.toLowerCase().includes(filterQuery.toLowerCase()));
        if (!matchesName && !matchesChild) return null;
      }

      const isExpanded = Boolean(expandedFolders[node.relativePath]);
      const isSelected = activeTabPath === node.relativePath;

      return (
        <div key={node.relativePath} className="select-none text-[12.5px] font-mono">
          <div
            onClick={() => handleOpenFile(node)}
            className={`group flex items-center justify-between px-2 py-1 rounded-[6px] cursor-pointer transition-colors ${
              isSelected
                ? 'bg-accent/15 text-accent font-semibold'
                : 'text-ink/80 hover:bg-sunken hover:text-ink'
            }`}
            style={{ paddingLeft: `${depth * 14 + 8}px` }}
            title={node.relativePath}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {node.isDirectory ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(node.relativePath);
                  }}
                  className="p-0.5 hover:text-ink text-muted"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  )}
                </span>
              ) : (
                <span className="w-3.5 shrink-0" />
              )}
              {getFileIcon(node.name, node.isDirectory, isExpanded)}
              <span className="truncate">{node.name}</span>
            </div>

            {canEdit && !node.isIgnored && (
              <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
                {node.isDirectory && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalState({
                        isOpen: true,
                        type: 'create-file',
                        targetItem: node,
                        inputValue: ''
                      });
                    }}
                    className="p-1 hover:text-emerald-400 text-muted rounded"
                    title="Nuevo archivo aquí"
                  >
                    <FilePlus className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalState({
                      isOpen: true,
                      type: 'rename',
                      targetItem: node,
                      inputValue: node.name
                    });
                  }}
                  className="p-1 hover:text-accent text-muted rounded"
                  title="Renombrar"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalState({
                      isOpen: true,
                      type: 'delete',
                      targetItem: node,
                      inputValue: ''
                    });
                  }}
                  className="p-1 hover:text-red-400 text-muted rounded"
                  title="Eliminar"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {node.isDirectory && isExpanded && node.children && (
            <div>{renderTreeNodes(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  const selectedProjectObj = projects.find((p) => p.id === selectedProjectId);
  const vsCodeIframeUrl = `/vscode/?folder=${encodeURIComponent(selectedProjectObj?.path || '/var/www/my-portfolio')}`;

  return (
    <div className="flex-1 flex flex-col h-full bg-paper relative overflow-hidden select-text font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        className="hidden"
      />

      {/* Top Header / Project Switcher, Mode Toggles & Toolbar */}
      <header className="px-3.5 py-2.5 border-b border-edge bg-panel/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Project Selector */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-accent/15 text-accent border border-accent/30 shadow-v2-sm">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted">
                Proyecto:
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-sunken border border-edge rounded-[8px] px-2.5 py-1 text-xs font-semibold text-ink focus:border-accent focus:outline-none cursor-pointer"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.port ? `(:${p.port})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[10px] font-mono text-muted/80 truncate mt-0.5">
              {selectedProjectObj?.path || '/var/www/...'}
            </span>
          </div>
        </div>

        {/* Center: IDE Mode Toggle (VS Code Full with Extension Marketplace vs Monaco Quick Editor) */}
        {canEdit && (
          <div className="flex items-center bg-sunken border border-edge/80 p-0.5 rounded-[10px] shadow-v2-sm">
            <button
              onClick={() => setViewMode('vscode')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'vscode'
                  ? 'bg-accent text-white font-semibold shadow-v2-sm'
                  : 'text-muted hover:text-ink'
              }`}
              title="Visual Studio Code oficial con Marketplace de Extensiones y Terminal"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>VS Code Completo (Extensiones)</span>
            </button>
            <button
              onClick={() => setViewMode('monaco')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'monaco'
                  ? 'bg-accent text-white font-semibold shadow-v2-sm'
                  : 'text-muted hover:text-ink'
              }`}
              title="Editor Rápido y Gestor de Archivos nativo de Ask-Rodrigo"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Editor Rápido</span>
            </button>
          </div>
        )}

        {/* Right Actions: Mode Specific Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === 'vscode' && canEdit ? (
            <>
              {/* Copy VS Code Password */}
              <button
                onClick={handleCopyPassword}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-mono bg-sunken border border-edge text-ink/90 hover:text-accent hover:border-accent/40 transition-all cursor-pointer shadow-v2-sm"
                title="Copiar contraseña de acceso de VS Code (RodrigoDev2026!)"
              >
                {copiedKey ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{copiedKey ? '¡Copiada!' : 'Clave: RodrigoDev2026!'}</span>
              </button>

              {/* Open in Full Browser Tab */}
              <a
                href={vsCodeIframeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-medium bg-sunken border border-edge text-ink/90 hover:text-ink hover:border-accent/40 transition-all cursor-pointer shadow-v2-sm"
                title="Abrir VS Code en una pestaña completa del navegador"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Nueva Pestaña</span>
              </a>

              {/* Reload Iframe */}
              <button
                onClick={() => setIframeKey(Date.now())}
                className="p-1.5 rounded-[8px] text-muted hover:text-ink hover:bg-sunken border border-edge transition-all cursor-pointer"
                title="Recargar VS Code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            /* Monaco Quick Mode Actions */
            <>
              {canEdit ? (
                <>
                  <button
                    onClick={() =>
                      setModalState({
                        isOpen: true,
                        type: 'create-file',
                        targetItem: null,
                        inputValue: ''
                      })
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-xs font-medium bg-sunken border border-edge text-ink/90 hover:text-ink hover:border-accent/40 transition-all cursor-pointer shadow-v2-sm"
                    title="Crear nuevo archivo"
                  >
                    <FilePlus className="w-3.5 h-3.5 text-accent" />
                    <span>Archivo</span>
                  </button>

                  <button
                    onClick={() =>
                      setModalState({
                        isOpen: true,
                        type: 'create-folder',
                        targetItem: null,
                        inputValue: ''
                      })
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-xs font-medium bg-sunken border border-edge text-ink/90 hover:text-ink hover:border-accent/40 transition-all cursor-pointer shadow-v2-sm"
                    title="Crear nueva carpeta"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Carpeta</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium bg-sunken border border-edge text-ink/90 hover:text-ink hover:border-accent/40 transition-all cursor-pointer shadow-v2-sm disabled:opacity-50"
                    title="Subir archivos desde tu computadora al VPS"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isUploading ? 'Subiendo...' : 'Subir'}</span>
                  </button>

                  <button
                    onClick={handleSaveFile}
                    disabled={!currentTab?.isDirty || isSaving || currentTab?.isBinary}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all cursor-pointer shadow-v2-sm ${
                      currentTab?.isDirty
                        ? 'bg-gradient-to-r from-accent to-[#b4532f] text-white hover:opacity-95 shadow-[0_2px_10px_rgba(201,100,66,0.35)] animate-pulse'
                        : 'bg-sunken border border-edge text-muted cursor-not-allowed opacity-60'
                    }`}
                    title="Guardar archivo actual (Ctrl + S)"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Modo Lectura</span>
                </div>
              )}

              <button
                onClick={() => loadTree(selectedProjectId)}
                disabled={treeLoading}
                className="p-1.5 rounded-[8px] text-muted hover:text-ink hover:bg-sunken border border-edge transition-all cursor-pointer"
                title="Recargar árbol de archivos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${treeLoading ? 'animate-spin text-accent' : ''}`} />
              </button>
            </>
          )}

          {/* Role Badge */}
          <div
            className={`hidden md:flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded-[8px] border ${
              isOwner
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : canEdit
                ? 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                : 'bg-slate-700/50 border-slate-600 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>{isOwner ? 'Owner' : canEdit ? 'Editor' : 'Viewer'}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Area: Mode Switch */}
      {viewMode === 'vscode' && canEdit ? (
        /* 1. Full VS Code Server with Extension Marketplace, Terminal, and Git */
        <div className="flex-1 w-full h-full relative bg-[#1e1e1e]">
          <iframe
            key={iframeKey}
            src={vsCodeIframeUrl}
            className="w-full h-full border-none"
            title="Visual Studio Code Online Suite"
            allow="clipboard-read *; clipboard-write *; clipboard-read; clipboard-write; fullscreen"
            tabIndex={0}
          />

        </div>
      ) : (
        /* 2. Quick Native Monaco Editor & File Tree Explorer */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: File Explorer */}
          <aside className="w-64 md:w-72 border-r border-edge bg-panel flex flex-col shrink-0">
            <div className="p-2.5 border-b border-edge/60 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted uppercase tracking-wider px-1">
                <span>Explorador de Archivos</span>
                <span className="text-[10px] text-muted/60">{tree.length} items</span>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Filtrar archivos..."
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className="w-full bg-sunken border border-edge rounded-[7px] pl-8 pr-2.5 py-1 text-xs text-ink placeholder:text-muted/60 focus:border-accent focus:outline-none font-mono"
                />
                {filterQuery && (
                  <button
                    onClick={() => setFilterQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 [scrollbar-width:thin]">
              {treeLoading && tree.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted font-mono flex flex-col items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                  <span>Cargando archivos del VPS...</span>
                </div>
              ) : tree.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted font-mono">
                  No hay archivos disponibles en este directorio.
                </div>
              ) : (
                renderTreeNodes(tree)
              )}
            </div>
          </aside>

          {/* Center Monaco Editor & Tabs */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
            <div className="h-9 bg-[#252526] border-b border-[#333333] flex items-center overflow-x-auto [scrollbar-width:none] shrink-0 select-none">
              {openTabs.map((tab) => {
                const isActive = tab.path === activeTabPath;
                return (
                  <div
                    key={tab.path}
                    onClick={() => setActiveTabPath(tab.path)}
                    className={`h-full flex items-center gap-2 px-3.5 border-r border-[#333333] cursor-pointer text-xs font-mono transition-colors shrink-0 ${
                      isActive
                        ? 'bg-[#1e1e1e] text-white border-t-2 border-t-accent font-medium'
                        : 'bg-[#2d2d2d] text-zinc-400 hover:bg-[#282828] hover:text-zinc-200'
                    }`}
                    title={tab.path}
                  >
                    {getFileIcon(tab.name)}
                    <span className="truncate max-w-[140px]">{tab.name}</span>
                    {tab.isDirty && (
                      <span
                        className="w-2 h-2 rounded-full bg-accent shrink-0 animate-pulse"
                        title="Cambios no guardados"
                      />
                    )}
                    <button
                      onClick={(e) => handleCloseTab(e, tab.path)}
                      className="p-0.5 rounded hover:bg-white/10 hover:text-white text-zinc-400"
                      title="Cerrar pestaña"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {openTabs.length === 0 && (
                <div className="px-3 text-xs font-mono text-zinc-500 italic">
                  Ningún archivo abierto
                </div>
              )}
            </div>

            <div className="flex-1 relative overflow-hidden">
              {fileLoading ? (
                <div className="absolute inset-0 bg-[#1e1e1e]/90 backdrop-blur-sm grid place-items-center text-xs font-mono text-zinc-300 z-10">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                    <span>Cargando archivo desde el servidor...</span>
                  </div>
                </div>
              ) : null}

              {currentTab ? (
                currentTab.isBinary ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                    <h3 className="text-sm font-semibold text-zinc-200">Archivo Binario</h3>
                    <p className="text-xs font-mono mt-1 text-zinc-400">
                      {currentTab.name} ({formatBytes(currentTab.size)})
                    </p>
                    <p className="text-xs text-zinc-500 mt-2 max-w-sm">
                      Este formato no puede previsualizarse ni editarse como texto plano en el editor.
                    </p>
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    language={currentTab.language}
                    value={currentTab.content}
                    theme="vs-dark"
                    onChange={handleEditorChange}
                    onMount={handleEditorDidMount}
                    options={{
                      readOnly: !canEdit,
                      minimap: { enabled: true },
                      fontSize: 13,
                      fontFamily:
                        "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
                      fontLigatures: true,
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      cursorBlinking: 'smooth',
                      smoothScrolling: true,
                      bracketPairColorization: { enabled: true },
                      formatOnPaste: true
                    }}
                  />
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400 select-none">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-zinc-800/60 border border-zinc-700/60 mb-4 shadow-v2-md">
                    <Code2 className="w-8 h-8 text-accent" />
                  </div>
                  <h2 className="text-base font-semibold text-zinc-200">
                    Editor Rápido — Ask-Rodrigo
                  </h2>
                  <p className="text-xs text-zinc-400 max-w-md mt-1.5 leading-relaxed font-mono">
                    Selecciona cualquier archivo del explorador a la izquierda o cambia a{' '}
                    <strong className="text-accent font-semibold">VS Code Completo</strong> arriba
                    para utilizar la terminal y el marketplace de extensiones.
                  </p>
                </div>
              )}
            </div>

            <footer className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[11px] font-mono shrink-0 select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-semibold">
                  <Code2 className="w-3 h-3" />
                  {selectedProjectObj?.name || 'Workspace'}
                </span>
                {currentTab && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-xs">{currentTab.path}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                {currentTab && !currentTab.isBinary && (
                  <>
                    <span>
                      Ln {editorCursorInfo.line}, Col {editorCursorInfo.col}
                    </span>
                    <span>UTF-8</span>
                    <span className="uppercase">{currentTab.language}</span>
                  </>
                )}
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] ${
                    canEdit ? 'bg-black/20 text-white font-medium' : 'bg-amber-400 text-black font-bold'
                  }`}
                >
                  {canEdit ? 'EDITABLE' : 'READ-ONLY'}
                </span>
              </div>
            </footer>
          </main>
        </div>
      )}


      {/* Action Modals */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-[14px] bg-panel border border-edge p-5 shadow-v2-lg flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                {modalState.type === 'create-file' && <FilePlus className="w-4 h-4 text-accent" />}
                {modalState.type === 'create-folder' && (
                  <FolderPlus className="w-4 h-4 text-amber-400" />
                )}
                {modalState.type === 'delete' && <Trash2 className="w-4 h-4 text-red-400" />}
                {modalState.type === 'rename' && <Edit3 className="w-4 h-4 text-sky-400" />}

                <span>
                  {modalState.type === 'create-file' && 'Nuevo Archivo'}
                  {modalState.type === 'create-folder' && 'Nueva Carpeta'}
                  {modalState.type === 'delete' && 'Confirmar Eliminación'}
                  {modalState.type === 'rename' && 'Renombrar Elemento'}
                </span>
              </h3>
              <button
                onClick={() =>
                  setModalState({ isOpen: false, type: null, targetItem: null, inputValue: '' })
                }
                className="text-muted hover:text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalState.type === 'delete' ? (
              <p className="text-xs text-muted leading-relaxed">
                ¿Estás seguro de que deseas eliminar permanentemente{' '}
                <strong className="text-ink font-mono">{modalState.targetItem?.name}</strong>?
                Esta acción borrará el archivo en el servidor y no se puede deshacer.
              </p>
            ) : (
              <form onSubmit={handleModalSubmit} className="flex flex-col gap-3">
                <label className="text-xs font-mono text-muted">
                  {modalState.type === 'create-file' && 'Nombre del archivo (ej: script.js):'}
                  {modalState.type === 'create-folder' && 'Nombre de la carpeta (ej: componentes):'}
                  {modalState.type === 'rename' && 'Nuevo nombre:'}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={modalState.inputValue}
                  onChange={(e) =>
                    setModalState((prev) => ({ ...prev, inputValue: e.target.value }))
                  }
                  placeholder={
                    modalState.type === 'create-file'
                      ? 'nombre.js'
                      : modalState.type === 'create-folder'
                      ? 'nombre-carpeta'
                      : 'nuevo-nombre'
                  }
                  className="w-full bg-sunken border border-edge rounded-[8px] px-3 py-2 text-xs font-mono text-ink focus:border-accent focus:outline-none"
                />
              </form>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge/60">
              <button
                type="button"
                onClick={() =>
                  setModalState({ isOpen: false, type: null, targetItem: null, inputValue: '' })
                }
                className="px-3 py-1.5 rounded-[8px] text-xs font-medium text-muted hover:text-ink hover:bg-sunken cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                className={`px-3.5 py-1.5 rounded-[8px] text-xs font-semibold cursor-pointer shadow-v2-sm ${
                  modalState.type === 'delete'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-accent hover:opacity-90 text-white'
                }`}
              >
                {modalState.type === 'delete' ? 'Eliminar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] text-xs font-medium shadow-v2-lg border animate-slide-up ${
            toastMessage.type === 'error'
              ? 'bg-red-500/15 border-red-500/30 text-red-400'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <Check className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage.message}</span>
        </div>
      )}
    </div>
  );
}
export default DeveloperView;
