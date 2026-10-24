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
  AlertCircle
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
  onSpeakText
}) {
  const [inputText, setInputText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

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

  const normalizedSuggestions = React.useMemo(() => {
    const fallback = [
      '¿Cuál es el estado de la infraestructura en el VPS?',
      'Verifica el estado de los servicios systemd y procesos PM2',
      'Explícame la arquitectura de TotiMigraciones y PresWin',
      '¿Qué experiencia y habilidades técnicas tiene Rodrigo?'
    ];
    if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
      return fallback;
    }
    const list = [];
    for (const item of suggestions) {
      if (typeof item === 'string') {
        list.push(item);
      } else if (item && Array.isArray(item.questions)) {
        for (const q of item.questions) {
          if (typeof q === 'string') list.push(q);
        }
      } else if (item && typeof item.question === 'string') {
        list.push(item.question);
      }
    }
    return list.length > 0 ? list.slice(0, 6) : fallback;
  }, [suggestions]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 relative">
      {/* Session Top Bar */}
      <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-teal-400" />
          <span>Sesión:</span>
          <span className="text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-xs">
            {conversationId || 'Nueva Sesión (Autocreada)'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
            <Cpu className="w-3 h-3" />
            <span>AGy-cli Engine</span>
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingReply ? (
          <div className="max-w-xl mx-auto py-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-xl shadow-teal-500/5">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Asistente de Infraestructura & Agente AGy
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Conectado directamente a la terminal de Antigravity CLI en tu VPS Debian 13.
                Pregúntame sobre tus servidores, proyectos o tareas del día a día.
              </p>
            </div>

            {/* Suggestions Grid */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {normalizedSuggestions.map((text, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestion ? onSelectSuggestion(text) : onSendMessage(text)}
                  className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-teal-500/40 text-xs text-slate-300 hover:text-white transition-all text-left group flex items-start justify-between gap-2 shadow-sm"
                >
                  <span>{typeof text === 'string' ? text : String(text)}</span>
                  <Sparkles className="w-3.5 h-3.5 text-slate-600 group-hover:text-teal-400 shrink-0 mt-0.5" />
                </button>
              ))}
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
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 mt-0.5 shadow-sm">
                    <Terminal className="w-4 h-4" />
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
                        {msg.time ? new Date(msg.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Ahora'}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        {speechEnabled && onSpeakText && (
                          <button
                            onClick={() => onSpeakText(msg.content)}
                            title="Escuchar respuesta"
                            className="p-1 rounded hover:bg-slate-800 hover:text-teal-400 transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(msg.content, index)}
                          title="Copiar texto"
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
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0 mt-0.5 animate-pulse">
              <Terminal className="w-4 h-4" />
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

        {/* Status indicator while AGy is thinking */}
        {isGenerating && !streamingReply && (
          <div className="flex items-center gap-2 max-w-4xl mx-auto text-xs text-teal-400 font-mono py-2 px-1">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
            <span>{streamingStatus || 'AGy-cli procesando turno y consultando herramientas...'}</span>
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
                ? 'AGy-cli está ejecutando...'
                : 'Escribe tu consulta o comando para AGy (ej. "¿Cómo está el estado de los servicios?"). Presiona Enter para enviar.'
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
