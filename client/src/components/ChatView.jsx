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
  PanelRightClose
} from 'lucide-react';
import { marked } from 'marked';
import { uploadAdminFile } from '../services/api.js';

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
  isSubagentsOpen,
  onToggleSubagents,
  t
}) {
  const [inputText, setInputText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    try {
      const res = await uploadAdminFile(file);
      setAttachedFiles((prev) => [
        ...prev,
        {
          filename: res.filename,
          originalName: res.originalName,
          size: res.size,
          path: res.path
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

  const removeAttachment = (index) => {
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!inputText.trim() && attachedFiles.length === 0) || isGenerating || isUploading) return;

    let finalMessage = inputText.trim();
    if (attachedFiles.length > 0) {
      const fileReferences = attachedFiles.map((f) => 
        `📎 [Archivo adjunto en el servidor]: ${f.path}\n- Nombre original: ${f.originalName} (${formatFileSize(f.size)})`
      ).join('\n\n');

      if (finalMessage) {
        finalMessage = `${fileReferences}\n\n${finalMessage}`;
      } else {
        finalMessage = `${fileReferences}\n\nPor favor lee el archivo adjunto usando tus herramientas de lectura de archivos e indícame tu análisis o realiza la acción necesaria.`;
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
    { id: 'portfolio', label: tw.portfolio, path: '/var/www/my-portfolio' },
    { id: 'preswin', label: tw.preswin, path: '/var/www/preswin' },
    { id: 'totimigraciones', label: tw.totimigraciones, path: '/var/www/totimigraciones' },
    { id: 'wiwishop', label: tw.wiwishop, path: '/var/www/my-portfolio/public/wiwishop' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-paper relative overflow-hidden select-text">
      {/* Ask Marvin Top Bar: Greeting & Context Workspace Pills */}
      <div className="px-4 py-3 border-b border-edge bg-panel/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        {/* Left: Greeting & Status */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[16px] font-semibold text-ink leading-none">
              {isAdmin ? 'Hello Rodrigo.' : 'Hello Guest.'}
            </h1>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <p className="text-[11.5px] text-muted mt-1 flex items-center gap-2 font-mono">
            <span>0 chats waiting</span>
            <span>·</span>
            <span className="text-accent font-medium">
              {isAdmin ? ct.engineAdmin : ct.engineGuest}
            </span>
            {isAdmin && (
              <>
                <span>·</span>
                <span className="text-slate-400 truncate max-w-[150px] sm:max-w-xs">
                  {conversationId ? `Session: ${conversationId.slice(0, 8)}...` : 'New turn'}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Right: Subagent Inspector Toggle */}
        {isAdmin && onToggleSubagents && (
          <div className="flex items-center gap-2">
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
          </div>
        )}

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
                  className={`relative group rounded-[16px] px-4 py-3 max-w-[85%] text-sm leading-relaxed ${
                    isUser
                      ? 'bg-accent text-white rounded-tr-none shadow-v2-sm'
                      : 'bg-panel border border-edge text-ink rounded-tl-none shadow-v2-sm'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
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
            <div className="rounded-[16px] px-4 py-3 max-w-[85%] text-sm bg-panel border border-accent/40 text-ink rounded-tl-none shadow-v2-md">
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
                  <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="font-mono text-[11px] max-w-[200px] sm:max-w-[300px] truncate font-medium">
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

          <div className="relative flex items-center rounded-[20px] bg-panel border border-edge shadow-v2-md focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all p-1.5">
            {/* Admin File Upload Button */}
            {isAdmin && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".txt,.log,.md,.markdown,.js,.mjs,.cjs,.ts,.jsx,.tsx,.py,.json,.sh,.bash,.zsh,.yml,.yaml,.css,.scss,.html,.sql,.env,.csv,.tsv,.xml,.conf,.ini,.cfg,.patch,.diff,.java,.c,.cpp,.h,.hpp,.rs,.go,.php,.rb,.toml"
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
