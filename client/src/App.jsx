import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { MetricsView } from './components/MetricsView';
import { CalendarView } from './components/CalendarView';
import { ProfileModal } from './components/ProfileModal';
import { 
  fetchConversations, 
  fetchConversationDetail, 
  deleteConversation, 
  streamChatMessage, 
  fetchMetrics, 
  fetchCalendarEvents, 
  createCalendarEvent, 
  removeCalendarEvent, 
  fetchProfile, 
  fetchSuggestions, 
  fetchHealth 
} from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'metrics' | 'calendar'
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streamingReply, setStreamingReply] = useState('');
  const [streamingStatus, setStreamingStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  // Metrics state
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Profile and Health
  const [profileData, setProfileData] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Voice Speech
  const [speechEnabled, setSpeechEnabled] = useState(false);

  // 1. Initial Data Load
  useEffect(() => {
    loadHealth();
    loadConversations();
    loadProfile();
    loadSuggestions();
    loadMetrics();
    loadCalendar();
  }, []);

  const loadHealth = async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
    } catch (err) {
      console.warn('Health check warning:', err);
    }
  };

  const loadConversations = async () => {
    setConversationsLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const p = await fetchProfile();
      setProfileData(p);
    } catch (err) {
      console.warn('Failed to load profile:', err);
    }
  };

  const loadSuggestions = async () => {
    try {
      const s = await fetchSuggestions();
      setSuggestions(s.suggestions || []);
    } catch (err) {
      console.warn('Failed to load suggestions:', err);
    }
  };

  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const m = await fetchMetrics();
      setMetrics(m);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const loadCalendar = async () => {
    setCalendarLoading(true);
    try {
      const c = await fetchCalendarEvents();
      setCalendarEvents(c.events || []);
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  // 2. Select / Load Conversation
  const handleSelectConversation = async (id) => {
    if (isGenerating) return;
    setActiveConversationId(id);
    setActiveTab('chat');
    try {
      const detail = await fetchConversationDetail(id);
      setMessages(detail.messages || []);
      setStreamingReply('');
    } catch (err) {
      console.error('Failed to load transcript:', err);
    }
  };

  const handleNewChat = () => {
    if (isGenerating) return;
    setActiveConversationId(null);
    setMessages([]);
    setStreamingReply('');
    setStreamingStatus('');
    setActiveTab('chat');
  };

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id);
      if (activeConversationId === id) {
        handleNewChat();
      }
      loadConversations();
    } catch (err) {
      alert('Error eliminando sesión: ' + err.message);
    }
  };

  // 3. Send Message to AGy via SSE Stream
  const handleSendMessage = (text) => {
    if (!text || isGenerating) return;

    const userMsg = {
      role: 'user',
      content: text,
      time: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);
    setStreamingReply('');
    setStreamingStatus('Iniciando proceso en Antigravity CLI...');

    let accumulatedText = '';
    let currentConvId = activeConversationId;

    streamChatMessage(text, currentConvId, {
      onInit: (data) => {
        if (data.conversationId) {
          currentConvId = data.conversationId;
          setActiveConversationId(data.conversationId);
        }
      },
      onStatus: (data) => {
        setStreamingStatus(data.message || 'Ejecutando...');
      },
      onDelta: (chunk) => {
        accumulatedText += chunk;
        setStreamingReply(accumulatedText);
      },
      onDone: (meta) => {
        setIsGenerating(false);
        setStreamingStatus('');
        const finalReply = accumulatedText || 'Turno finalizado.';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: finalReply,
            time: new Date().toISOString()
          }
        ]);
        setStreamingReply('');
        loadConversations();

        // Speech synthesis if enabled
        if (speechEnabled) {
          speakText(finalReply);
        }
      },
      onError: (errMsg) => {
        setIsGenerating(false);
        setStreamingStatus('');
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ **Error en AGy-cli**: ${errMsg}`,
            time: new Date().toISOString()
          }
        ]);
        setStreamingReply('');
      }
    });
  };

  // 4. Speech Synthesis
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`[\]()]/g, ' ').slice(0, 400);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-ES';
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  // 5. Calendar Handlers
  const handleCreateEvent = async (eventData) => {
    try {
      await createCalendarEvent(eventData);
      loadCalendar();
    } catch (err) {
      alert('Error creando evento: ' + err.message);
    }
  };

  const handleDeleteEvent = async (id) => {
    try {
      await removeCalendarEvent(id);
      loadCalendar();
    } catch (err) {
      alert('Error eliminando evento: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-darkbg text-slate-100 overflow-hidden">
      {/* Top Navbar */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProfile={() => setIsProfileOpen(true)}
        speechEnabled={speechEnabled}
        onToggleSpeech={() => setSpeechEnabled(!speechEnabled)}
        health={health}
        metricsLoading={metricsLoading}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chat' ? (
          <>
            <Sidebar
              conversations={conversations}
              activeId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              onDeleteConversation={handleDeleteConversation}
              loading={conversationsLoading}
            />
            <ChatView
              conversationId={activeConversationId}
              messages={messages}
              streamingReply={streamingReply}
              streamingStatus={streamingStatus}
              isGenerating={isGenerating}
              onSendMessage={handleSendMessage}
              suggestions={suggestions}
              onSelectSuggestion={handleSendMessage}
              speechEnabled={speechEnabled}
              onSpeakText={speakText}
            />
          </>
        ) : activeTab === 'metrics' ? (
          <MetricsView
            metrics={metrics}
            loading={metricsLoading}
            onRefresh={loadMetrics}
          />
        ) : (
          <CalendarView
            events={calendarEvents}
            onCreateEvent={handleCreateEvent}
            onDeleteEvent={handleDeleteEvent}
            loading={calendarLoading}
          />
        )}
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profileData={profileData}
      />
    </div>
  );
}
