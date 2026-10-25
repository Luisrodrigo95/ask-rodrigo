import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Terminal, 
  User, 
  Copy, 
  Check, 
  Sparkles, 
  Cpu, 
  Clock, 
  Volume2,
  RefreshCw,
  AlertCircle,
  Shield,
  HelpCircle,
  Paperclip,
  FileText,
  X,
  UploadCloud,
  FolderCode,
  Bot,
  PanelRight,
  PanelRightClose,
  Image as ImageIcon,
  MessageSquare,
  Calendar,
  Activity,
  ChevronDown,
  Zap,
  Brain
} from 'lucide-react';
import { marked } from 'marked';
import { uploadAdminFile } from '../services/api.js';
import { UsageCounter } from './UsageCounter.jsx';
import { ToolActionItem } from './ToolActionItem.jsx';
import rodrigoIcon from '../assets/rodrigo-icon.png';

export const MODEL_OPTIONS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', provider: 'Google DeepMind', badge: 'Recomendado', supportsEffort: true },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', badge: 'Thinking', supportsEffort: false },
  { id: 'claude-opus-4-6-thinking', name: 'Claude Opus 4.6', provider: 'Anthropic', badge: 'Deep Thinking', supportsEffort: false },
  { id: 'gpt-oss-120b-medium', name: 'GPT-OSS 120B', provider: 'Open Source', badge: '120B Medium', supportsEffort: false }
];

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Configure marked to render code blocks and links cleanly
marked.setOptions({
  gfm: true,
  breaks: true
});

function renderMarkdown(content) {
  if (!content) return '';
  try {
    return marked.parse(content);
  } catch {
    return content;
  }
}

function renderUserMessage(text) {
  if (!text) return null;
  const imgRegex = /(?:🖼️|📎)\s*\[(?:Imagen|Archivo) adjunto en el servidor\]:\s*(\/home\/bombi\/uploads\/([^\s\n]+\.(?:png|jpe?g|webp|gif|svg|bmp|ico)))/gi;
  
  const images = [];
  let match;
  while ((match = imgRegex.exec(text)) !== null) {
    images.push({ path: match[1], filename: match[2] });
  }

  let cleanText = text;
  images.forEach((img) => {
    cleanText = cleanText.replace(
      new RegExp(`(?:🖼️|📎)\\s*\\[(?:Imagen|Archivo) adjunto en el servidor\\]:\\s*${img.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*\\n(?:-[^\\n]*\\n)*`, 'g'),
      ''
    );
  });
  cleanText = cleanText.trim();

  return (
    <div className="space-y-2.5">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {images.map((img, i) => (
            <a
              key={i}
              href={`/api/upload/raw/${img.filename}`}
              target="_blank"
              rel="noreferrer"
              className="group/img relative block overflow-hidden rounded-xl border border-white/20 bg-black/30 hover:border-white/50 transition-all shadow-md"
              title="Click para abrir imagen en tamaño completo"
            >
              <img
                src={`/api/upload/raw/${img.filename}`}
                alt={img.filename}
                className="max-h-52 max-w-xs object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-[1.03]"
                loading="lazy"
              />
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-black/75 text-white/90 backdrop-blur-xs">
                {img.filename.split('.').pop().toUpperCase()}
              </span>
            </a>
          ))}
        </div>
      )}
      {cleanText && <div className="whitespace-pre-wrap">{cleanText}</div>}
    </div>
  );
}

export function ChatView({
  conversationId,
  messages,
  streamingReply,
  streamingStatus,
  isGenerating,
  onSendMessage,
  suggestions,
  onSelectSuggestion,
  speechEnabled,
  onSpeakText,
  currentUser,
  activeWorkspace = 'normal',
  onSelectWorkspace,
  isDrawerOpen,
  onToggleDrawer,
  isSubagentsOpen,
  onToggleSubagents,
  verboseMode = false,
  onToggleVerboseMode,
  streamingTools = [],
  selectedModel = 'gemini-3.8-flash',
  onChangeModel,
  thinkingEffort = 'high',
  onChangeThinkingEffort,
  t
}) {
  const [inputText, setInputText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const draftsRef = useRef({});
  const prevConvIdRef = useRef(conversationId);

  // Close model popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isModelDropdownOpen]);

  const currentModelObj = MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0];

  const adjustTextareaHeight = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(Math.max(el.scrollHeight, 46), 220);
    el.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputText]);

  useEffect(() => {
    if (prevConvIdRef.current !== conversationId) {
      draftsRef.current[prevConvIdRef.current || 'new'] = inputText;
      setInputText(draftsRef.current[conversationId || 'new'] || '');
      setAttachedFiles([]);
      prevConvIdRef.current = conversationId;
      isNearBottomRef.current = true;
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
        adjustTextareaHeight();
      }, 40);
    }
  }, [conversationId]);

  const isAdmin = currentUser?.role === 'admin';
  const ct = t.chat;
  const tw = t.workspaces;

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 120;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  const scrollToBottom = (behavior = 'auto') => {
    if (behavior === 'auto' && !isNearBottomRef.current) return;
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, streamingReply]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);

  useEffect(() => {
    const handleInsertPrompt = (e) => {
      if (e.detail?.text) {
        setInputText((prev) => (prev ? `${prev}\n\n${e.detail.text}` : e.detail.text));
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('insert_chat_prompt', handleInsertPrompt);
    return () => window.removeEventListener('insert_chat_prompt', handleInsertPrompt);
  }, []);

  const uploadSingleFile = async (file) => {
    if (!file) return;

    const isImg = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|bmp|ico)$/i.test(file.name);
    let localPreviewUrl = null;
    if (isImg) {
      try {
        localPreviewUrl = URL.createObjectURL(file);
      } catch {
        // ignore
      }
    }

    setIsUploading(true);
    setUploadError('');
    try {
      const res = await uploadAdminFile(file);
      setAttachedFiles((prev) => [
        ...prev,
        {
          filename: res.filename,
          originalName: res.originalName || file.name,
          size: res.size || file.size,
          path: res.path,
          isImage: res.isImage ?? isImg,
          url: res.url || `/api/upload/raw/${res.filename}`,
          previewUrl: localPreviewUrl
        }
      ]);
    } catch (err) {
      console.error('[Upload Error]:', err);
      setUploadError(err.message || ct.fileUploadError);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadSingleFile(file);
    }
  };

  const handlePaste = (e) => {
    if (!isAdmin) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const ext = item.type.split('/')[1] || 'png';
        const safeExt = ext.replace(/[^a-z0-9]/gi, '') || 'png';
        const pastedName = `pasted-image-${Date.now()}.${safeExt}`;
        const renamedFile = new File([file], pastedName, { type: item.type });
        uploadSingleFile(renamedFile);
        break;
      }
    }
  };

  const handleDragOver = (e) => {
    if (!isAdmin) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    if (!isAdmin) return;
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    if (!isAdmin) return;
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        uploadSingleFile(files[i]);
      }
    }
  };

  const removeAttachment = (index) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if ((!inputText.trim() && attachedFiles.length === 0) || isGenerating || isUploading) return;

    let finalMessage = inputText.trim();
    if (attachedFiles.length > 0) {
      const fileReferences = attachedFiles.map((f) => {
        const isImg = f.isImage || /\.(jpe?g|png|webp|gif|svg)$/i.test(f.originalName || f.path || '');
        if (isImg) {
          return `🖼️ [Imagen adjunta en el servidor]: ${f.path}\n- Nombre original: ${f.originalName} (${formatFileSize(f.size)})\n- Instrucción visual: Utiliza la herramienta view_file para inspeccionar y analizar esta imagen binaria directamente.`;
        }
        return `📎 [Archivo adjunto en el servidor]: ${f.path}\n- Nombre original: ${f.originalName} (${formatFileSize(f.size)})`;
      }).join('\n\n');

      if (finalMessage) {
        finalMessage = `${fileReferences}\n\n${finalMessage}`;
      } else {
        const hasImg = attachedFiles.some((f) => f.isImage || /\.(jpe?g|png|webp|gif|svg)$/i.test(f.originalName || f.path || ''));
        finalMessage = `${fileReferences}\n\nPor favor ${hasImg ? 'inspecciona la imagen adjunta con view_file y analiza su contenido' : 'lee el archivo adjunto usando tus herramientas de lectura de archivos e indícame tu análisis o realiza la acción necesaria'}.`;
      }
    }

    draftsRef.current[conversationId || 'new'] = '';
    setInputText('');
    setAttachedFiles([]);
    setUploadError('');
    isNearBottomRef.current = true;
    setTimeout(() => {
      scrollToBottom('smooth');
      if (inputRef.current) inputRef.current.style.height = '46px';
    }, 40);
    onSendMessage(finalMessage, activeWorkspace);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Localized prompt chips
  const activeChips = isAdmin ? t.adminSuggestions : t.guestQuestions;

  const workspaceOptions = [
    { id: 'normal', label: tw.normal, path: '/home/bombi' },
    { id: 'askrodrigo', label: tw.askrodrigo || 'Ask-Rodrigo', path: '/var/www/ask-rodrigo' },
    { id: 'portfolio', label: tw.portfolio, path: '/var/www/my-portfolio' },
    { id: 'preswin', label: tw.preswin, path: '/var/www/preswin' },
    { id: 'totimigraciones', label: tw.totimigraciones, path: '/var/www/totimigraciones' },
    { id: 'wiwishop', label: tw.wiwishop, path: '/var/www/my-portfolio/public/wiwishop' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-paper relative overflow-hidden select-text">
      {/* Ask Marvin Top Bar: Greeting & Context Workspace Pills */}
      <div className="px-4 py-3 border-b border-edge bg-panel/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        {/* Left: Drawer Toggle Button (Mobile/Tablet) + Greeting & Status */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onToggleDrawer && (
            <button
              onClick={onToggleDrawer}
              className="p-1.5 rounded-[8px] bg-sunken border border-edge text-muted hover:text-ink md:hidden cursor-pointer shrink-0 transition-colors shadow-v2-sm"
              title="Historial de conversaciones"
              aria-label="Abrir historial de conversaciones"
            >
              <MessageSquare className="w-4 h-4 text-accent" />
            </button>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] sm:text-[16px] font-semibold text-ink leading-none truncate">
                {isAdmin ? 'Hello Rodrigo.' : 'Hello Guest.'}
              </h1>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            </div>
            <p className="text-[11px] sm:text-[11.5px] text-muted mt-1 flex items-center gap-1.5 sm:gap-2 font-mono truncate">
              <span>0 chats waiting</span>
              <span>·</span>
              <span className="text-accent font-medium">
                {isAdmin ? ct.engineAdmin : ct.engineGuest}
              </span>
              {isAdmin && (
                <>
                  <span>·</span>
                  <span className="text-slate-400 truncate max-w-[120px] sm:max-w-xs">
                    {conversationId ? `Session: ${conversationId.slice(0, 8)}...` : 'New turn'}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Model & Reasoning Selector, AI Usage Counter, Subagent Inspector & Verbose Mode */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Interactive Model & Reasoning Quality Selector Pill */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-[10px] text-xs font-mono font-medium transition-all border cursor-pointer bg-sunken border-edge text-ink hover:border-accent/40 shadow-v2-sm"
              title={ct.modelSelectorLabel || 'Modelo y Razonamiento'}
              aria-expanded={isModelDropdownOpen}
            >
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="font-semibold text-accent max-w-[85px] sm:max-w-none truncate">
                {currentModelObj.name}
              </span>
              <span className="hidden sm:inline text-muted/60">·</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                thinkingEffort === 'high'
                  ? 'bg-purple-500/20 text-purple-300'
                  : thinkingEffort === 'medium'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {thinkingEffort === 'high' ? 'High' : thinkingEffort === 'medium' ? 'Med' : 'Low'}
              </span>
              <ChevronDown className={`w-3 h-3 text-muted shrink-0 transition-transform duration-200 ${isModelDropdownOpen ? 'rotate-180 text-accent' : ''}`} />
            </button>

            {/* Model & Reasoning Popover Dropdown */}
            {isModelDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 p-3 rounded-2xl bg-panel/95 border border-edge shadow-2xl backdrop-blur-xl animate-fadeIn space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-edge/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    <span>{ct.modelSelectorLabel || 'Modelo y Razonamiento'}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                    ⏱️ 2h Timeout
                  </span>
                </div>

                {/* Model Selection */}
                <div className="space-y-1.5">
                  <span className="text-[10.5px] font-mono text-muted uppercase tracking-wider block">
                    {ct.modelLabel || 'Modelo de IA'}
                  </span>
                  <div className="space-y-1">
                    {MODEL_OPTIONS.map((m) => {
                      const isSelected = selectedModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            onChangeModel && onChangeModel(m.id);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all border cursor-pointer ${
                            isSelected
                              ? 'bg-accent/15 border-accent text-ink shadow-xs'
                              : 'bg-paper/60 border-edge/50 hover:bg-sunken text-muted hover:text-ink'
                          }`}
                        >
                          <div className="min-w-0 pr-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-ink truncate">{m.name}</span>
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-sunken text-muted border border-edge/60">
                                {m.badge}
                              </span>
                            </div>
                            <div className="text-[10.5px] text-muted truncate">{m.provider}</div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-accent shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Thinking Effort Quality: Low, Medium, High */}
                <div className="pt-2 border-t border-edge/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-mono text-muted uppercase tracking-wider">
                      {ct.thinkingEffort || 'Calidad de Pensamiento'}
                    </span>
                    <span className="text-[10px] font-mono text-accent uppercase font-bold">
                      {thinkingEffort}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-sunken border border-edge">
                    <button
                      type="button"
                      onClick={() => onChangeThinkingEffort && onChangeThinkingEffort('low')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        thinkingEffort === 'low'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      <span>🟢 Low</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onChangeThinkingEffort && onChangeThinkingEffort('medium')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        thinkingEffort === 'medium'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      <span>🟡 Med</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onChangeThinkingEffort && onChangeThinkingEffort('high')}
                      className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        thinkingEffort === 'high'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                          : 'text-muted hover:text-ink'
                      }`}
                    >
                      <span>🟣 High</span>
                    </button>
                  </div>

                  <p className="text-[10.5px] text-muted leading-tight">
                    {thinkingEffort === 'high'
                      ? 'Pensamiento profundo paso a paso para análisis exhaustivo y arquitectura.'
                      : thinkingEffort === 'medium'
                        ? 'Pensamiento equilibrado con buena velocidad y análisis técnico.'
                        : 'Mínima latencia con respuestas ágiles y directas.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Circular 5-hour quota counter & popover */}
          <UsageCounter currentUser={currentUser} t={t} />

          {/* Verbose Mode Quick Toggle */}
          {onToggleVerboseMode && (
            <button
              onClick={onToggleVerboseMode}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs font-mono font-medium transition-all border cursor-pointer ${
                verboseMode
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-v2-sm'
                  : 'bg-sunken border-edge text-muted hover:text-ink hover:border-edge'
              }`}
              title={verboseMode ? 'Modo Verboso Activado (Clic para desactivar)' : 'Modo Verboso Desactivado (Clic para ver comandos y herramientas)'}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{ct.verboseBadge || 'Verbose'}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  verboseMode ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-muted/40'
                }`}
              />
            </button>
          )}

          {isAdmin && onToggleSubagents && (
            <button
              onClick={onToggleSubagents}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs font-medium transition-all border cursor-pointer ${
                isSubagentsOpen
                  ? 'bg-accent/15 border-accent text-accent shadow-v2-sm'
                  : 'bg-sunken border-edge text-muted hover:text-ink hover:border-accent/40'
              }`}
              title="Toggle Subagent & Inspector Panel"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inspector</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </button>
          )}
        </div>

        {/* Marvin "Work in" Context Workspace Switcher */}
        {isAdmin && (
          <div className="w-full flex items-center gap-2 pt-1 overflow-x-auto [scrollbar-width:none]">
            <span className="text-[11px] font-medium text-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
              <FolderCode className="w-3 h-3 text-accent" />
              {tw.workIn}
            </span>
            <div className="flex items-center gap-1.5">
              {workspaceOptions.map((ws) => {
                const isActive = activeWorkspace === ws.id;
                return (
                  <button
                    key={ws.id}
                    onClick={() => onSelectWorkspace && onSelectWorkspace(ws.id)}
                    title={ws.path}
                    className={`px-2.5 py-1 rounded-[8px] text-[11.5px] font-mono transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-panel border border-accent/40 text-accent font-semibold shadow-v2-sm ring-1 ring-accent/30'
                        : 'bg-sunken border border-edge/60 text-muted hover:text-ink hover:border-edge'
                    }`}
                  >
                    {ws.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4 [scrollbar-width:thin] min-w-0 w-full"
      >
        {messages.length === 0 && !streamingReply ? (
          <div className="max-w-2xl mx-auto py-10 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto rounded-2xl p-0.5 bg-gradient-to-tr from-accent/40 via-teal-500/30 to-slate-700/50 shadow-v2-md ring-1 ring-edge">
              <img src={rodrigoIcon} alt="Rodrigo" className="w-full h-full object-cover rounded-[14px]" />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className={`pulse-beacon absolute inline-flex h-full w-full rounded-full opacity-75 ${isAdmin ? 'bg-emerald-400' : 'bg-teal-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-paper ${isAdmin ? 'bg-emerald-500' : 'bg-teal-500'}`}></span>
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">
                {isAdmin ? ct.welcomeAdmin : ct.welcomeGuest}
              </h2>
              <p className="text-xs text-muted mt-1 max-w-lg mx-auto leading-relaxed">
                {isAdmin ? ct.welcomeAdminDesc : ct.welcomeGuestDesc}
              </p>
            </div>

            {/* Platform Capabilities Showcase Card for Guests */}
            {!isAdmin && (
              <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-panel/95 to-sunken/90 border border-edge/80 shadow-v2-md text-left space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center text-accent ring-1 ring-accent/30 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-ink">
                        {ct.showcaseTitle}
                      </h3>
                      <p className="text-[11px] text-muted">
                        {ct.showcaseDesc}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-paper/60 border border-edge/60 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-ink flex items-center gap-1.5">
                        {ct.featChatTitle}
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-300">IA</span>
                      </div>
                      <div className="text-[11px] text-muted leading-tight mt-0.5">
                        {ct.featChatDesc}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-paper/60 border border-edge/60 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-ink flex items-center gap-1.5">
                        {ct.featClockTitle}
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300">Live</span>
                      </div>
                      <div className="text-[11px] text-muted leading-tight mt-0.5">
                        {ct.featClockDesc}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-paper/60 border border-edge/60 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <FolderCode className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-ink flex items-center gap-1.5">
                        {ct.featDevTitle}
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300">IDE</span>
                      </div>
                      <div className="text-[11px] text-muted leading-tight mt-0.5">
                        {ct.featDevDesc}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-paper/60 border border-edge/60 flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-ink flex items-center gap-1.5">
                        {ct.featCalTitle}
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300">Sync</span>
                      </div>
                      <div className="text-[11px] text-muted leading-tight mt-0.5">
                        {ct.featCalDesc}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-paper/60 border border-edge/60 flex items-start gap-2.5 sm:col-span-2">
                    <div className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-ink flex items-center gap-1.5">
                        {ct.featMetricsTitle}
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300">Debian 13</span>
                      </div>
                      <div className="text-[11px] text-muted leading-tight mt-0.5">
                        {ct.featMetricsDesc}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      if (onSelectSuggestion) {
                        onSelectSuggestion(ct.showcasePrompt);
                      } else {
                        onSendMessage(ct.showcasePrompt, activeWorkspace);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-accent/15 hover:bg-accent/25 border border-accent/30 text-accent font-medium text-xs transition-colors cursor-pointer group shadow-v2-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    <span>{ct.showcaseAskBtn}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Suggestions Grid */}
            <div className="pt-2">
              <p className="text-[11px] font-mono text-muted mb-2.5 uppercase tracking-wider">
                {isAdmin ? ct.quickChipsAdmin : ct.quickChipsGuest}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {activeChips.map((text, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectSuggestion ? onSelectSuggestion(text) : onSendMessage(text, activeWorkspace)}
                    className="p-3 rounded-[12px] bg-panel hover:bg-sunken border border-edge hover:border-accent/40 text-xs text-ink/80 hover:text-ink transition-all text-left group flex items-start justify-between gap-2 shadow-v2-sm cursor-pointer"
                  >
                    <span>{text}</span>
                    <Sparkles className="w-3.5 h-3.5 text-muted group-hover:text-accent shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex gap-2.5 sm:gap-3 max-w-4xl mx-auto w-full min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-[10px] overflow-hidden shrink-0 mt-0.5 shadow-v2-sm border border-edge ring-1 ring-white/5">
                    <img src={rodrigoIcon} alt="Rodrigo" className="w-full h-full object-cover" />
                  </div>
                )}

                <div
                  className={`relative group rounded-[16px] px-3.5 sm:px-4 py-2.5 sm:py-3 max-w-[92%] sm:max-w-[85%] min-w-0 text-xs sm:text-sm leading-relaxed break-words [overflow-wrap:anywhere] ${
                    isUser
                      ? 'bg-accent text-white rounded-tr-none shadow-v2-sm'
                      : 'bg-panel border border-edge text-ink rounded-tl-none shadow-v2-sm'
                  }`}
                >
                  {isUser ? (
                    renderUserMessage(msg.content)
                  ) : (
                    <div className="min-w-0 w-full">
                      {/* Verbose Tool Actions (Collapsible items, minimized by default) */}
                      {verboseMode && msg.tools && msg.tools.length > 0 && (
                        <div className="space-y-1 mb-2.5">
                          {msg.tools.map((tool, tIdx) => (
                            <ToolActionItem key={tIdx} tool={tool} ct={ct} />
                          ))}
                        </div>
                      )}

                      {msg.content ? (
                        <div
                          className="prose prose-invert prose-sm max-w-none min-w-0 break-words [overflow-wrap:anywhere] prose-pre:bg-sunken prose-pre:border prose-pre:border-edge prose-pre:rounded-[10px] prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:whitespace-pre prose-code:break-words prose-table:block prose-table:max-w-full prose-table:overflow-x-auto prose-a:text-accent prose-a:break-all"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                      ) : null}

                      {/* Action Bar for AI response */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-edge/60 text-[11px] text-muted">
                        <button
                          onClick={() => handleCopy(msg.content, index)}
                          className="flex items-center gap-1 hover:text-ink transition-colors cursor-pointer"
                          title={ct.copyText}
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">{ct.copied}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{ct.copyText}</span>
                            </>
                          )}
                        </button>

                        {speechEnabled && onSpeakText && (
                          <button
                            onClick={() => onSpeakText(msg.content)}
                            className="flex items-center gap-1 hover:text-ink transition-colors cursor-pointer"
                            title={ct.listen}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>{ct.listen}</span>
                          </button>
                        )}

                        {msg.time && (
                          <span className="ml-auto font-mono text-[10px] text-muted/70 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-[10px] bg-sunken border border-edge flex items-center justify-center shrink-0 mt-0.5 text-muted">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live Streaming Delta & Live Tool Actions */}
        {(streamingReply || (verboseMode && streamingTools && streamingTools.length > 0)) && (
          <div className="flex gap-2.5 sm:gap-3 max-w-4xl mx-auto w-full min-w-0 justify-start">
            <div className="w-8 h-8 rounded-[10px] overflow-hidden border border-accent/40 shrink-0 mt-0.5 ring-2 ring-accent/30 animate-pulse">
              <img src={rodrigoIcon} alt="Rodrigo" className="w-full h-full object-cover" />
            </div>
            <div className="rounded-[16px] px-3.5 sm:px-4 py-2.5 sm:py-3 max-w-[92%] sm:max-w-[85%] min-w-0 text-xs sm:text-sm bg-panel border border-accent/40 text-ink rounded-tl-none shadow-v2-md break-words [overflow-wrap:anywhere]">
              {/* Live Streaming Tools if Verbose Mode is enabled */}
              {verboseMode && streamingTools && streamingTools.length > 0 && (
                <div className="space-y-1 mb-2.5">
                  {streamingTools.map((tool, tIdx) => (
                    <ToolActionItem key={tIdx} tool={tool} ct={ct} />
                  ))}
                </div>
              )}

              {streamingReply ? (
                <>
                  <div
                    className="prose prose-invert prose-sm max-w-none min-w-0 break-words [overflow-wrap:anywhere] prose-pre:bg-sunken prose-pre:border prose-pre:border-edge prose-pre:rounded-[10px] prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:whitespace-pre prose-code:break-words prose-table:block prose-table:max-w-full prose-table:overflow-x-auto prose-a:text-accent prose-a:break-all"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingReply) }}
                  />
                  <span className="inline-block w-2 h-4 bg-accent ml-1 animate-ping" />
                </>
              ) : isGenerating ? (
                <div className="flex items-center gap-2 text-xs text-accent font-mono py-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{streamingStatus || (isAdmin ? ct.processingAdmin : ct.processingGuest)}</span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Status indicator (when no streamingReply and no streamingTools) */}
        {isGenerating && !streamingReply && (!verboseMode || !streamingTools || streamingTools.length === 0) && (
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full min-w-0 text-xs text-accent font-mono py-2 px-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
            <span>{streamingStatus || (isAdmin ? ct.processingAdmin : ct.processingGuest)}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer (Modern Card Style with dynamic auto-height & iPhone safe-area padding) */}
      <div className="p-2.5 sm:p-4 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] border-t border-edge bg-paper/95 backdrop-blur-md shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex flex-col gap-2">
          {/* Attached Files & Upload Status Badges */}
          {(attachedFiles.length > 0 || isUploading || uploadError) && (
            <div className="flex flex-wrap items-center gap-2 px-1">
              {attachedFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="group/pill flex items-center gap-2 px-2.5 py-1.5 rounded-[12px] bg-panel border border-accent/40 text-xs text-ink shadow-v2-sm hover:border-accent transition-all animate-fadeIn"
                >
                  {f.isImage && (f.previewUrl || f.url) ? (
                    <img
                      src={f.previewUrl || f.url}
                      alt={f.originalName}
                      className="w-8 h-8 object-cover rounded-lg border border-edge/80 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-accent" />
                    </div>
                  )}
                  <div className="min-w-0 flex flex-col">
                    <span className="font-mono text-[11px] max-w-[140px] sm:max-w-[220px] truncate font-medium text-ink">
                      {f.originalName}
                    </span>
                    <span className="text-[10px] text-accent font-mono">
                      {formatFileSize(f.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-muted hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer ml-1"
                    title={ct.removeAttachment}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-panel border border-accent/40 text-xs text-accent font-mono shadow-v2-sm">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-[11px]">{ct.uploadingFile}</span>
                </div>
              )}
              {uploadError && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-[12px]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* Main Card Container */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex flex-col rounded-[20px] bg-panel border shadow-v2-md transition-all p-2 sm:p-2.5 ${
              isDragging
                ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                : 'border-edge focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20'
            }`}
          >
            {/* Visual Dropzone Indicator */}
            {isDragging && (
              <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[20px] bg-panel/95 border-2 border-dashed border-accent backdrop-blur-xs text-accent font-medium text-xs pointer-events-none gap-2">
                <UploadCloud className="w-5 h-5 animate-bounce" />
                <span>Suelta aquí tu imagen o archivo para adjuntarlo</span>
              </div>
            )}

            {/* Input Textarea (Auto-resizing, 16px minimum font size on mobile to stop iOS auto-zoom) */}
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={
                isGenerating
                  ? 'Rodrigo está respondiendo... Puedes redactar tu siguiente mensaje aquí.'
                  : isAdmin
                    ? `[${activeWorkspace.toUpperCase()}] ${ct.placeholderAdmin}`
                    : ct.placeholderGuest
              }
              rows="1"
              className="w-full bg-transparent border-none text-[16px] sm:text-sm text-ink placeholder-muted/60 focus:outline-none focus:ring-0 resize-none px-2 sm:px-3 pt-1.5 pb-2 min-h-[46px] max-h-[220px] [scrollbar-width:thin] leading-relaxed"
            />

            {/* Box Action Toolbar (bottom row) */}
            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-edge/40 px-1">
              {/* Left Actions: File attachment & Workspace pill & Clear button & Quick Thinking Toggle */}
              <div className="flex items-center gap-1.5 min-w-0">
                {isAdmin && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.svg,.bmp,.ico,.txt,.log,.md,.markdown,.js,.mjs,.cjs,.ts,.jsx,.tsx,.py,.json,.sh,.bash,.zsh,.yml,.yaml,.css,.scss,.html,.sql,.env,.csv,.tsv,.xml,.conf,.ini,.cfg,.patch,.diff,.java,.c,.cpp,.h,.hpp,.rs,.go,.php,.rb,.toml"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      title={ct.attachFile}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-[10px] text-muted hover:text-accent hover:bg-sunken transition-all cursor-pointer text-xs"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline font-mono text-[11px]">Adjuntar</span>
                    </button>
                  </>
                )}

                {/* Quick Thinking Quality Toggle Chip */}
                <button
                  type="button"
                  onClick={() => {
                    if (!onChangeThinkingEffort) return;
                    const nextEffort = thinkingEffort === 'low' ? 'medium' : thinkingEffort === 'medium' ? 'high' : 'low';
                    onChangeThinkingEffort(nextEffort);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-[8px] text-[11px] font-mono font-medium transition-all cursor-pointer border ${
                    thinkingEffort === 'high'
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25 shadow-xs'
                      : thinkingEffort === 'medium'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 shadow-xs'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 shadow-xs'
                  }`}
                  title={`Calidad de pensamiento: ${thinkingEffort.toUpperCase()} (Clic para alternar Low / Medium / High)`}
                >
                  <span>
                    {thinkingEffort === 'high' ? '🧠 High' : thinkingEffort === 'medium' ? '⚡ Med' : '🟢 Low'}
                  </span>
                </button>

                {isAdmin && activeWorkspace && (
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] bg-sunken border border-edge/60 text-[10.5px] font-mono text-muted truncate max-w-[150px]">
                    <FolderCode className="w-3 h-3 text-accent shrink-0" />
                    <span className="truncate">{activeWorkspace}</span>
                  </span>
                )}

                {inputText && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputText('');
                      if (inputRef.current) inputRef.current.style.height = '46px';
                    }}
                    className="text-muted hover:text-ink text-[11px] font-mono px-1.5 py-1 rounded hover:bg-sunken cursor-pointer transition-colors"
                    title="Limpiar texto"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Right Actions: Desktop Keyboard Hint & Send Button */}
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-block text-[10.5px] font-mono text-muted/60 select-none">
                  Shift + ↵ salto de línea
                </span>

                <button
                  type="submit"
                  disabled={(!inputText.trim() && attachedFiles.length === 0) || isUploading || isGenerating}
                  title={
                    isGenerating
                      ? 'Rodrigo está procesando una respuesta...'
                      : (!inputText.trim() && attachedFiles.length === 0)
                        ? 'Escribe un mensaje para enviar'
                        : 'Enviar mensaje (Enter)'
                  }
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-[12px] font-medium text-xs transition-all shrink-0 cursor-pointer ${
                    isGenerating
                      ? 'bg-accent/20 border border-accent/40 text-accent cursor-wait'
                      : (inputText.trim() || attachedFiles.length > 0) && !isUploading
                        ? 'bg-accent hover:bg-accent/90 text-white shadow-v2-sm active:scale-95'
                        : 'bg-sunken text-muted/40 cursor-not-allowed border border-edge/40'
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden sm:inline">Generando</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Enviar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
