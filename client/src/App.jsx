import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { PrimaryRail } from './components/PrimaryRail';
import { SessionDrawer } from './components/SessionDrawer';
import { SubagentPanel } from './components/SubagentPanel';
import { FloatingDock } from './components/FloatingDock';
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

  // Layout states for Dual-Sidebar & Subagents Inspector (Ask Marvin DNA)
  const [isRailCollapsed, setIsRailCollapsed] = useState(() => localStorage.getItem('ask_rodrigo_rail_collapsed') === 'true');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [isSubagentsOpen, setIsSubagentsOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(() => localStorage.getItem('ask_rodrigo_workspace') || 'normal');

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

  const handleSelectConversation = async (id) => {
    if (isGenerating) return;
    setActiveConversationId(id);
    localStorage.setItem('ask_rodrigo_active_conv', id);
    setActiveTab('chat');
    try {
      const detail = await fetchConversationDetail(id);
      setMessages(detail.messages || []);
      setStreamingReply('');
    } catch (err) {
      console.error('Failed to load transcript:', err);
    }
  };

  const loadConversations = async (autoSelect = true) => {
    if (currentUser?.role !== 'admin') return;
    setConversationsLoading(true);
    try {
      const data = await fetchConversations();
      const list = data.conversations || [];
      setConversations(list);

      const savedConv = localStorage.getItem('ask_rodrigo_active_conv');
      if (autoSelect && list.length > 0 && !activeConversationId) {
        const targetId = list.find((c) => c.id === savedConv) ? savedConv : list[0].id;
        handleSelectConversation(targetId);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (isGenerating) return;
    setActiveConversationId(null);
    localStorage.removeItem('ask_rodrigo_active_conv');
    setMessages([]);
    setStreamingReply('');
    setActiveTab('chat');
  };

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
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
    localStorage.removeItem('ask_rodrigo_active_conv');
    logout();
    await handleGuestLogin();
  };

  // 3. Settings & Workspace Handlers
  const handleChangeLanguage = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('ask_rodrigo_lang', newLang);
  };

  const handleToggleSpeech = () => {
    setSpeechEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('ask_rodrigo_speech', String(next));
      if (!next && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  };

  const handleChangeSpeechRate = (rate) => {
    setSpeechRate(rate);
    localStorage.setItem('ask_rodrigo_speech_rate', String(rate));
  };

  const handleSaveGoogleClientId = (id) => {
    setGoogleClientId(id);
    localStorage.setItem('ask_rodrigo_google_client_id', id);
  };

  const handleToggleRail = () => {
    setIsRailCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ask_rodrigo_rail_collapsed', String(next));
      return next;
    });
  };

  const handleSelectWorkspace = (ws) => {
    setActiveWorkspace(ws);
    localStorage.setItem('ask_rodrigo_workspace', ws);
  };

  // 4. Send Message via Stream with Workspace (cwd) parameter
  const handleSendMessage = (text, targetWorkspace = activeWorkspace) => {
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
    }, targetWorkspace);
  };

  // 5. Speech Synthesis with language and rate support
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`[\]()]/g, ' ').slice(0, 400);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = language === 'es' ? 'es-ES' : 'en-US';
    utterance.rate = speechRate || 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // 6. Calendar Handlers
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
    <div className="flex h-screen w-screen bg-paper text-ink overflow-hidden select-none">
      {/* 1. Primary Left Navigation Rail (224px or 64px collapsed) */}
      <PrimaryRail
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isRailCollapsed}
        onToggleCollapse={handleToggleRail}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        t={t}
      />

      {/* 2. Main Workstation Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Mobile Header (Visible only on screens below md) */}
        <div className="md:hidden flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-panel">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className="grid h-7 w-7 place-items-center rounded-[8px] bg-gradient-to-br from-[#d9714d] to-[#b4532f] text-xs font-bold text-white shadow-sm"
            >
              R
            </button>
            <span className="text-sm font-semibold text-ink">Ask Rodrigo</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-2 py-1 rounded-[6px] text-xs font-medium ${activeTab === 'chat' ? 'bg-accent text-white' : 'text-muted'}`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-2 py-1 rounded-[6px] text-xs font-medium ${activeTab === 'calendar' ? 'bg-accent text-white' : 'text-muted'}`}
            >
              Cal
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-2 py-1 rounded-[6px] text-xs font-medium ${activeTab === 'metrics' ? 'bg-accent text-white' : 'text-muted'}`}
              >
                Ops
              </button>
            )}
            <button
              onClick={() => (currentUser?.role === 'admin' ? setIsProfileOpen(true) : setIsLoginOpen(true))}
              className="p-1 rounded-[6px] text-muted hover:text-ink"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          {activeTab === 'chat' ? (
            <>
              {/* Dual-Sidebar Drawer: Date-grouped sessions */}
              <SessionDrawer
                conversations={conversations}
                activeId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
                onDeleteConversation={handleDeleteConversation}
                loading={conversationsLoading}
                currentUser={currentUser}
                onOpenLogin={() => setIsLoginOpen(true)}
                isDrawerOpen={isDrawerOpen}
                onCloseDrawer={() => setIsDrawerOpen(false)}
                t={t}
              />

              {/* Central Chat View */}
              <ChatView
                conversationId={activeConversationId}
                messages={messages}
                streamingReply={streamingReply}
                streamingStatus={streamingStatus}
                isGenerating={isGenerating}
                onSendMessage={handleSendMessage}
                suggestions={suggestions}
                onSelectSuggestion={(sug) => handleSendMessage(sug, activeWorkspace)}
                speechEnabled={speechEnabled}
                onSpeakText={speakText}
                currentUser={currentUser}
                activeWorkspace={activeWorkspace}
                onSelectWorkspace={handleSelectWorkspace}
                isSubagentsOpen={isSubagentsOpen}
                onToggleSubagents={() => setIsSubagentsOpen((prev) => !prev)}
                t={t}
              />

              {/* Subagents & Dev Inspector Panel */}
              <SubagentPanel
                isOpen={isSubagentsOpen}
                onClose={() => setIsSubagentsOpen(false)}
                activeWorkspace={activeWorkspace}
                onSelectWorkspace={handleSelectWorkspace}
                currentUser={currentUser}
                t={t}
              />
            </>
          ) : activeTab === 'metrics' ? (
            <div className="flex-1 overflow-y-auto bg-paper p-4">
              <MetricsView
                metrics={metrics}
                loading={metricsLoading}
                onRefresh={loadMetrics}
                t={t}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-paper p-4">
              <CalendarView
                events={calendarEvents}
                onCreateEvent={handleCreateEvent}
                onDeleteEvent={handleDeleteEvent}
                loading={calendarLoading}
                currentUser={currentUser}
                t={t}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Quick Dock (Bottom-Right) */}
      <FloatingDock
        currentLanguage={language}
        onToggleLanguage={() => handleChangeLanguage(language === 'en' ? 'es' : 'en')}
        speechEnabled={speechEnabled}
        onToggleSpeech={handleToggleSpeech}
        isSubagentsOpen={isSubagentsOpen}
        onToggleSubagents={() => setIsSubagentsOpen((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isAdmin={currentUser?.role === 'admin'}
      />

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
