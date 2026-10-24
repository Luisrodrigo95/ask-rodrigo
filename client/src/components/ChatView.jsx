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
  HelpCircle
} from 'lucide-react';
import { marked } from 'marked';

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
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    const msg = inputText.trim();
    setInputText('');
    onSendMessage(msg);
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
            className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pl-4 pr-12 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            className={`absolute right-2.5 bottom-4 p-2 rounded-xl transition-all ${
              inputText.trim() && !isGenerating
                ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-500/20 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
