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
  MessageSquare
} from 'lucide-react';
import { marked } from 'marked';
import { uploadAdminFile } from '../services/api.js';
import { UsageCounter } from './UsageCounter.jsx';

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
  t
}) {
  const [inputText, setInputText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin';
  const ct = t.chat;
  const tw = t.workspaces;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
    e.preventDefault();
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

    setInputText('');
    setAttachedFiles([]);
    setUploadError('');
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

        {/* Right: AI Usage Counter & Subagent Inspector Toggle */}
        <div className="flex items-center gap-2">
          {/* Circular 5-hour quota counter & popover (placed immediately to the left of Inspector) */}
          <UsageCounter currentUser={currentUser} t={t} />

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:thin]">
        {messages.length === 0 && !streamingReply ? (
          <div className="max-w-2xl mx-auto py-10 text-center space-y-4">
            <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-v2-md ${
              isAdmin 
                ? 'bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400' 
                : 'bg-gradient-to-tr from-[#d9714d]/20 to-[#b4532f]/20 border border-[#d9714d]/30 text-[#d9714d]'
            }`}>
              {isAdmin ? <Terminal className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
            </div>

            <div>
              <h2 className="text-lg font-bold text-ink tracking-tight">
                {isAdmin ? ct.welcomeAdmin : ct.welcomeGuest}
              </h2>
              <p className="text-xs text-muted mt-1 max-w-lg mx-auto leading-relaxed">
                {isAdmin ? ct.welcomeAdminDesc : ct.welcomeGuestDesc}
              </p>
            </div>

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
                className={`flex gap-3 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-v2-sm border ${
                    isAdmin 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-accent/10 border-accent/30 text-accent'
                  }`}>
                    {isAdmin ? <Terminal className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                )}

                <div
                  className={`relative group rounded-[16px] px-3.5 sm:px-4 py-2.5 sm:py-3 max-w-[92%] sm:max-w-[85%] text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-accent text-white rounded-tr-none shadow-v2-sm'
                      : 'bg-panel border border-edge text-ink rounded-tl-none shadow-v2-sm'
                  }`}
                >
                  {isUser ? (
                    renderUserMessage(msg.content)
                  ) : (
                    <div>
                      <div
                        className="prose prose-invert prose-sm max-w-none prose-pre:bg-sunken prose-pre:border prose-pre:border-edge prose-pre:rounded-[10px] prose-a:text-accent"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />

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

        {/* Live Streaming Delta */}
        {streamingReply && (
          <div className="flex gap-3 max-w-4xl mx-auto justify-start">
            <div className={`w-8 h-8 rounded-[10px] border flex items-center justify-center shrink-0 mt-0.5 animate-pulse ${
              isAdmin 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-accent/20 border-accent/40 text-accent'
            }`}>
              {isAdmin ? <Terminal className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div className="rounded-[16px] px-3.5 sm:px-4 py-2.5 sm:py-3 max-w-[92%] sm:max-w-[85%] text-xs sm:text-sm bg-panel border border-accent/40 text-ink rounded-tl-none shadow-v2-md">
              <div
                className="prose prose-invert prose-sm max-w-none prose-pre:bg-sunken prose-pre:border prose-pre:border-edge prose-pre:rounded-[10px] prose-a:text-accent"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingReply) }}
              />
              <span className="inline-block w-2 h-4 bg-accent ml-1 animate-ping" />
            </div>
          </div>
        )}

        {/* Status indicator */}
        {isGenerating && !streamingReply && (
          <div className="flex items-center gap-2 max-w-4xl mx-auto text-xs text-accent font-mono py-2 px-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
            <span>{streamingStatus || (isAdmin ? ct.processingAdmin : ct.processingGuest)}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer (Ask Marvin Style: rounded-[20px] shadow-v2-md bg-panel border-edge) */}
      <div className="p-3 border-t border-edge bg-paper/80 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          {/* Attached Files & Upload Status Badges */}
          {(attachedFiles.length > 0 || isUploading || uploadError) && (
            <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
              {attachedFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] bg-panel border border-accent/40 text-xs text-ink shadow-v2-sm animate-fadeIn"
                >
                  {f.isImage && (f.previewUrl || f.url) ? (
                    <img
                      src={f.previewUrl || f.url}
                      alt={f.originalName}
                      className="w-7 h-7 object-cover rounded-md border border-edge shrink-0 shadow-sm"
                    />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                  )}
                  <span className="font-mono text-[11px] max-w-[180px] sm:max-w-[260px] truncate font-medium">
                    {f.originalName}
                  </span>
                  <span className="text-[10px] text-accent font-mono">
                    {formatFileSize(f.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-muted hover:text-rose-400 transition-colors p-0.5 rounded cursor-pointer"
                    title={ct.removeAttachment}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-panel border border-edge text-xs text-accent animate-pulse font-mono">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="text-[11px]">{ct.uploadingFile}</span>
                </div>
              )}
              {uploadError && (
                <div className="flex items-center gap-1 text-[11px] text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-[10px]">
                  <AlertCircle className="w-3 h-3" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex items-center rounded-[20px] bg-panel border shadow-v2-md focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all p-1.5 ${
              isDragging
                ? 'border-accent bg-accent/10 ring-2 ring-accent/30'
                : 'border-edge'
            }`}
          >
            {/* Visual Dropzone Indicator */}
            {isDragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-paper/90 backdrop-blur-xs text-accent font-medium text-xs pointer-events-none gap-2">
                <UploadCloud className="w-4 h-4 animate-bounce" />
                <span>Suelta aquí tu imagen o archivo para adjuntarlo</span>
              </div>
            )}

            {/* Admin File Upload Button */}
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
                  disabled={isGenerating || isUploading}
                  title={ct.attachFile}
                  className="p-2 rounded-[12px] text-muted hover:text-accent hover:bg-sunken transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </>
            )}

            <textarea
              ref={inputRef}
              rows="2"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={isGenerating}
              placeholder={
                isGenerating
                  ? ct.generating
                  : isAdmin
                    ? `[${activeWorkspace.toUpperCase()}] ${ct.placeholderAdmin}`
                    : ct.placeholderGuest
              }
              className="w-full bg-transparent border-none text-xs sm:text-sm text-ink placeholder-muted/60 focus:outline-none focus:ring-0 resize-none px-3 py-1.5"
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && attachedFiles.length === 0) || isGenerating || isUploading}
              className={`p-2.5 rounded-[14px] transition-all shrink-0 ${
                (inputText.trim() || attachedFiles.length > 0) && !isGenerating && !isUploading
                  ? 'bg-accent hover:bg-accent/90 text-white shadow-v2-sm active:scale-95 cursor-pointer'
                  : 'bg-sunken text-muted/40 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
