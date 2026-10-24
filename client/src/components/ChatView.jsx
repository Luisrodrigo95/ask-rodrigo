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
  UploadCloud
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
    onSendMessage(finalMessage);
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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 relative">
      {/* Session Top Bar */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
          )}
          <span>{ct.session}</span>
          <span className="text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
            {isAdmin 
              ? (conversationId || ct.sessionNew) 
              : ct.sessionGuest}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
            isAdmin 
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
              : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
          }`}>
            <Cpu className="w-3 h-3" />
            <span>{isAdmin ? ct.engineAdmin : ct.engineGuest}</span>
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingReply ? (
          <div className="max-w-2xl mx-auto py-10 text-center space-y-4">
            <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xl ${
              isAdmin 
                ? 'bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 shadow-emerald-500/5' 
                : 'bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 border border-teal-500/30 text-teal-400 shadow-teal-500/5'
            }`}>
              {isAdmin ? <Terminal className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
            </div>

            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {isAdmin ? ct.welcomeAdmin : ct.welcomeGuest}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto leading-relaxed">
                {isAdmin ? ct.welcomeAdminDesc : ct.welcomeGuestDesc}
              </p>
            </div>

            {/* Suggestions Grid */}
            <div className="pt-2">
              <p className="text-[11px] font-mono text-slate-500 mb-2.5 uppercase tracking-wider">
                {isAdmin ? ct.quickChipsAdmin : ct.quickChipsGuest}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {activeChips.map((text, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectSuggestion ? onSelectSuggestion(text) : onSendMessage(text)}
                    className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 text-xs text-slate-300 hover:text-white transition-all text-left group flex items-start justify-between gap-2 shadow-sm"
                  >
                    <span>{text}</span>
                    <Sparkles className="w-3.5 h-3.5 text-slate-600 group-hover:text-teal-400 shrink-0 mt-0.5" />
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
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm border ${
                    isAdmin 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                  }`}>
                    {isAdmin ? <Terminal className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                )}

                <div
                  className={`relative group rounded-2xl px-4 py-3 max-w-[85%] text-sm leading-relaxed ${
                    isUser
                      ? 'bg-teal-600 text-white rounded-tr-none shadow-md shadow-teal-600/10'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div
                      className="prose prose-invert prose-sm max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl prose-a:text-teal-400"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                    />
                  )}

                  {/* Actions for Assistant messages */}
                  {!isUser && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1 text-[10px]">
                        <Clock className="w-3 h-3" />
                        {msg.time ? new Date(msg.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {speechEnabled && onSpeakText && (
                          <button
                            onClick={() => onSpeakText(msg.content)}
                            title={ct.listen}
                            className="p-1 rounded hover:bg-slate-800 hover:text-teal-400 transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(msg.content, index)}
                          title={ct.copyText}
                          className="p-1 rounded hover:bg-slate-800 hover:text-teal-400 transition-colors flex items-center gap-1"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-teal-300" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Live Streaming Delta */}
        {streamingReply && (
          <div className="flex gap-3 max-w-4xl mx-auto justify-start">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 animate-pulse ${
              isAdmin 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-teal-500/20 border-teal-500/40 text-teal-300'
            }`}>
              {isAdmin ? <Terminal className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div className="rounded-2xl px-4 py-3 max-w-[85%] text-sm bg-slate-900 border border-teal-500/40 text-slate-200 rounded-tl-none shadow-md shadow-teal-500/5">
              <div
                className="prose prose-invert prose-sm max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl prose-a:text-teal-400"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingReply) }}
              />
              <span className="inline-block w-2 h-4 bg-teal-400 ml-1 animate-ping"></span>
            </div>
          </div>
        )}

        {/* Status indicator */}
        {isGenerating && !streamingReply && (
          <div className="flex items-center gap-2 max-w-4xl mx-auto text-xs text-teal-400 font-mono py-2 px-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
            <span>{streamingStatus || (isAdmin ? ct.processingAdmin : ct.processingGuest)}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          {/* Attached Files & Upload Status Badges */}
          {(attachedFiles.length > 0 || isUploading || uploadError) && (
            <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
              {attachedFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-teal-500/40 text-xs text-slate-200 shadow-sm animate-fadeIn"
                >
                  <FileText className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="font-mono text-[11px] max-w-[200px] sm:max-w-[300px] truncate text-slate-100 font-medium">
                    {f.originalName}
                  </span>
                  <span className="text-[10px] text-teal-300/80 font-mono">
                    {formatFileSize(f.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="text-slate-400 hover:text-rose-400 transition-colors p-0.5 rounded cursor-pointer"
                    title={ct.removeAttachment}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-teal-400 animate-pulse font-mono">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="text-[11px]">{ct.uploadingFile}</span>
                </div>
              )}
              {uploadError && (
                <div className="flex items-center gap-1 text-[11px] text-rose-400 font-mono bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-xl">
                  <AlertCircle className="w-3 h-3" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          <div className="relative flex items-center">
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
                  className="absolute left-2.5 bottom-3 p-1.5 rounded-xl text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-40 cursor-pointer z-10"
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
                    ? ct.placeholderAdmin
                    : ct.placeholderGuest
              }
              className={`w-full bg-slate-900 border border-slate-700/80 rounded-2xl ${
                isAdmin ? 'pl-11' : 'pl-4'
              } pr-12 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none transition-all`}
            />

            <button
              type="submit"
              disabled={(!inputText.trim() && attachedFiles.length === 0) || isGenerating || isUploading}
              className={`absolute right-2.5 bottom-3 p-2 rounded-xl transition-all ${
                (inputText.trim() || attachedFiles.length > 0) && !isGenerating && !isUploading
                  ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-500/20 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
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
