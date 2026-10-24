import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { MetricsView } from './components/MetricsView';
import { CalendarView } from './components/CalendarView';
import { ProfileModal } from './components/ProfileModal';
import { LoginModal } from './components/LoginModal';
import { SettingsModal } from './components/SettingsModal';
import { translations } from './i18n/translations';
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
  fetchHealth,
  getStoredUser,
  getAuthToken,
  loginAsGuest,
  loginAsAdmin,
  loginWithGoogle,
  fetchMe,
  fetchAuthConfig,
  logout
} from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'metrics' | 'calendar'
  
  // Language state: English by default ('en'), persisted in localStorage
  const [language, setLanguage] = useState(() => localStorage.getItem('ask_rodrigo_lang') || 'en');
  const t = translations[language] || translations.en;

  const [currentUser, setCurrentUser] = useState(() => getStoredUser() || { role: 'guest', name: 'Guest' });
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  // Voice Speech & Speed Rate
  const [speechEnabled, setSpeechEnabled] = useState(() => localStorage.getItem('ask_rodrigo_speech') === 'true');
  const [speechRate, setSpeechRate] = useState(() => parseFloat(localStorage.getItem('ask_rodrigo_speech_rate')) || 1.0);
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('ask_rodrigo_google_client_id') || '');

  // 1. Initial Session Validation & Data Load
  useEffect(() => {
    initAuthAndData();
  }, []);

  const initAuthAndData = async () => {
    const token = getAuthToken();
    if (!token) {
      try {
        await loginAsGuest();
        setCurrentUser({ role: 'guest', name: 'Guest', email: null });
      } catch (err) {
        console.warn('Guest login initialization error:', err);
      }
    } else {
      try {
        const me = await fetchMe();
        if (me.authenticated && me.user) {
          setCurrentUser(me.user);
        } else {
          await loginAsGuest();
          setCurrentUser({ role: 'guest', name: 'Guest', email: null });
        }
      } catch {
        await loginAsGuest();
        setCurrentUser({ role: 'guest', name: 'Guest', email: null });
      }
    }

    loadHealth();
    loadProfile();
    loadSuggestions();
    loadCalendar();
    loadAuthConfig();
  };

  const loadAuthConfig = async () => {
    try {
      const cfg = await fetchAuthConfig();
      if (cfg?.googleClientId) {
        setGoogleClientId(cfg.googleClientId);
      }
    } catch (err) {
      console.warn('Failed to load auth config:', err);
    }
  };

  // Re-load role-dependent data when currentUser changes
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadConversations();
      loadMetrics();
    } else {
      setConversations([]);
      setMetrics(null);
      if (activeTab === 'metrics') {
        setActiveTab('chat');
      }
    }
  }, [currentUser?.role]);

  const loadHealth = async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
    } catch (err) {
      console.warn('Health check warning:', err);
    }
  };

  const loadConversations = async () => {
    if (currentUser?.role !== 'admin') return;
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

  const loadSuggestions = async (lang = language) => {
    try {
      const s = await fetchSuggestions(lang);
      setSuggestions(s.suggestions || []);
    } catch (err) {
      console.warn('Failed to load suggestions:', err);
    }
  };

  useEffect(() => {
    loadSuggestions(language);
  }, [language]);

  const loadMetrics = async () => {
    if (currentUser?.role !== 'admin') return;
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

  // 2. Authentication Handlers
  const handleGuestLogin = async () => {
    await loginAsGuest();
    setCurrentUser({ role: 'guest', name: 'Guest', email: null });
    setActiveConversationId(null);
    setMessages([]);
    loadSuggestions();
  };

  const handleAdminLogin = async (email, pin) => {
    const data = await loginAsAdmin(email, pin);
    setCurrentUser({ role: 'admin', name: data.name, email: data.email });
    loadConversations();
    loadMetrics();
  };

  const handleGoogleLogin = async (credential, accessToken) => {
    const data = await loginWithGoogle(credential, accessToken);
    setCurrentUser({ role: 'admin', name: data.name, email: data.email, picture: data.picture });
    loadConversations();
    loadMetrics();
  };

  const handleLogout = async () => {
    logout();
    await handleGuestLogin();
  };

  // 3. Settings Handlers
  const handleChangeLanguage = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('ask_rodrigo_lang', newLang);
  };

  const handleToggleSpeech = () => {
    const next = !speechEnabled;
    setSpeechEnabled(next);
    localStorage.setItem('ask_rodrigo_speech', String(next));
  };

  const handleChangeSpeechRate = (rate) => {
    setSpeechRate(rate);
    localStorage.setItem('ask_rodrigo_speech_rate', String(rate));
  };

  const handleSaveGoogleClientId = (id) => {
    setGoogleClientId(id);
    localStorage.setItem('ask_rodrigo_google_client_id', id);
  };

  // 4. Select / Load Conversation
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
      alert('Error archiving session: ' + err.message);
    }
  };

  // 5. Send Message via Stream
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
    setStreamingStatus(
      currentUser?.role === 'admin'
        ? t.chat.processingAdmin
        : t.chat.processingGuest
    );

    let accumulatedText = '';
    let currentConvId = activeConversationId;

    streamChatMessage(text, currentConvId, {
      onInit: (data) => {
        if (data.conversationId && currentUser?.role === 'admin') {
          currentConvId = data.conversationId;
          setActiveConversationId(data.conversationId);
        }
      },
      onStatus: (data) => {
        setStreamingStatus(data.message || 'Processing...');
      },
      onDelta: (chunk) => {
        accumulatedText += chunk;
        setStreamingReply(accumulatedText);
      },
      onDone: (meta) => {
        setIsGenerating(false);
        setStreamingStatus('');
        const finalReply = accumulatedText || 'Completed.';
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: finalReply,
            time: new Date().toISOString()
          }
        ]);
        setStreamingReply('');
        if (currentUser?.role === 'admin') {
          loadConversations();
        }

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
            content: `⚠️ **${t.chat.errorPrefix}**: ${errMsg}`,
            time: new Date().toISOString()
          }
        ]);
        setStreamingReply('');
      }
    });
  };

  // 6. Speech Synthesis with language and rate support
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`[\]()]/g, ' ').slice(0, 400);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = language === 'es' ? 'es-ES' : 'en-US';
    utterance.rate = speechRate || 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // 7. Calendar Handlers
  const handleCreateEvent = async (eventData) => {
    if (currentUser?.role !== 'admin') {
      setIsLoginOpen(true);
      return;
    }
    try {
      await createCalendarEvent(eventData);
      loadCalendar();
    } catch (err) {
      alert('Error creating event: ' + err.message);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (currentUser?.role !== 'admin') {
      setIsLoginOpen(true);
      return;
    }
    try {
      await removeCalendarEvent(id);
      loadCalendar();
    } catch (err) {
      alert('Error deleting event: ' + err.message);
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
        onToggleSpeech={handleToggleSpeech}
        health={health}
        metricsLoading={metricsLoading}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        t={t}
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
              currentUser={currentUser}
              onOpenLogin={() => setIsLoginOpen(true)}
              t={t}
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
              currentUser={currentUser}
              t={t}
            />
          </>
        ) : activeTab === 'metrics' ? (
          <MetricsView
            metrics={metrics}
            loading={metricsLoading}
            onRefresh={loadMetrics}
            t={t}
          />
        ) : (
          <CalendarView
            events={calendarEvents}
            onCreateEvent={handleCreateEvent}
            onDeleteEvent={handleDeleteEvent}
            loading={calendarLoading}
            currentUser={currentUser}
            t={t}
          />
        )}
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profileData={profileData}
      />

      {/* Login & Switch Role Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onGuestLogin={handleGuestLogin}
        onAdminLogin={handleAdminLogin}
        onGoogleLogin={handleGoogleLogin}
        currentRole={currentUser?.role}
        t={t}
      />

      {/* Preferences & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentLanguage={language}
        onChangeLanguage={handleChangeLanguage}
        speechEnabled={speechEnabled}
        onToggleSpeech={handleToggleSpeech}
        speechRate={speechRate}
        onChangeSpeechRate={handleChangeSpeechRate}
        googleClientId={googleClientId}
        onSaveGoogleClientId={handleSaveGoogleClientId}
        health={health}
        currentUser={currentUser}
        t={t}
      />
    </div>
  );
}
