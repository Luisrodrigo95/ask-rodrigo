import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, MessageSquare, Settings } from 'lucide-react';
import { PrimaryRail } from './components/PrimaryRail';
import { SessionDrawer } from './components/SessionDrawer';
import { SubagentPanel } from './components/SubagentPanel';
import { FloatingDock } from './components/FloatingDock';
import { ChatView } from './components/ChatView';
import { MetricsView } from './components/MetricsView';
import { CalendarView } from './components/CalendarView';
import { DeveloperView } from './components/DeveloperView';
import { ProfileModal } from './components/ProfileModal';
import rodrigoIcon from './assets/rodrigo-icon.png';

import { NotesModal } from './components/NotesModal';
import { LoginModal } from './components/LoginModal';
import { SettingsModal } from './components/SettingsModal';
import { translations } from './i18n/translations';
import { 
  fetchConversations, 
  fetchConversationDetail, 
  deleteConversation,
  batchDeleteConversations,
  batchArchiveConversations,
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : false));
  const [isSubagentsOpen, setIsSubagentsOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(() => localStorage.getItem('ask_rodrigo_workspace') || 'normal');

  // Quick Access / Floating Dock visibility (persisted)
  const [isDockVisible, setIsDockVisible] = useState(() => {
    const saved = localStorage.getItem('ask_rodrigo_dock_visible');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleDock = () => {
    setIsDockVisible((prev) => {
      const next = !prev;
      localStorage.setItem('ask_rodrigo_dock_visible', String(next));
      return next;
    });
  };

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [conversationsMessages, setConversationsMessages] = useState({}); // { [id | 'new']: Message[] }
  const [generatingMap, setGeneratingMap] = useState({}); // { [id | 'new']: boolean }
  const [streamingReplies, setStreamingReplies] = useState({}); // { [id | 'new']: string }
  const [streamingStatuses, setStreamingStatuses] = useState({}); // { [id | 'new']: string }
  const [conversationsLoading, setConversationsLoading] = useState(false);

  // Metrics state
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Calendar state
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Profile, Notes and Health
  const [profileData, setProfileData] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Voice Speech & Speed Rate
  const [speechEnabled, setSpeechEnabled] = useState(() => localStorage.getItem('ask_rodrigo_speech') === 'true');
  const [speechRate, setSpeechRate] = useState(() => parseFloat(localStorage.getItem('ask_rodrigo_speech_rate')) || 1.0);
  const [googleClientId, setGoogleClientId] = useState(() => localStorage.getItem('ask_rodrigo_google_client_id') || '');

  // Verbose Mode (inspection of executed commands & tools)
  const [verboseMode, setVerboseMode] = useState(() => {
    const saved = localStorage.getItem('ask_rodrigo_verbose_mode');
    return saved !== null ? saved === 'true' : true;
  });
  const [streamingTools, setStreamingTools] = useState({}); // { [convKey]: ToolItem[] }
  const streamingToolsRef = useRef({});

  const handleToggleVerboseMode = () => {
    setVerboseMode((prev) => {
      const next = !prev;
      localStorage.setItem('ask_rodrigo_verbose_mode', String(next));
      return next;
    });
  };

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
      if (activeTab === 'metrics' || activeTab === 'development') {
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
    setActiveConversationId(id);
    localStorage.setItem('ask_rodrigo_active_conv', id);
    setActiveTab('chat');

    // Only fetch if not currently streaming to avoid overwriting live background generation
    if (!generatingMap[id]) {
      try {
        const detail = await fetchConversationDetail(id);
        setConversationsMessages((prev) => ({
          ...prev,
          [id]: detail.messages || []
        }));
      } catch (err) {
        console.error('Failed to load transcript:', err);
      }
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
      if (autoSelect && list.length > 0 && !activeConversationId && savedConv) {
        const found = list.find((c) => c.id === savedConv);
        if (found) {
          handleSelectConversation(savedConv);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    localStorage.removeItem('ask_rodrigo_active_conv');
    setActiveTab('chat');
    if (!generatingMap['new']) {
      setConversationsMessages((prev) => ({ ...prev, new: [] }));
      setStreamingReplies((prev) => ({ ...prev, new: '' }));
      setStreamingStatuses((prev) => ({ ...prev, new: '' }));
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setConversationsMessages((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setGeneratingMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setStreamingReplies((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      setStreamingStatuses((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  const handleBatchDeleteConversations = async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    try {
      await batchDeleteConversations(ids);
      setConversations((prev) => prev.filter((c) => !ids.includes(c.id)));
      setConversationsMessages((prev) => {
        const copy = { ...prev };
        ids.forEach((id) => delete copy[id]);
        return copy;
      });
      setGeneratingMap((prev) => {
        const copy = { ...prev };
        ids.forEach((id) => delete copy[id]);
        return copy;
      });
      setStreamingReplies((prev) => {
        const copy = { ...prev };
        ids.forEach((id) => delete copy[id]);
        return copy;
      });
      setStreamingStatuses((prev) => {
        const copy = { ...prev };
        ids.forEach((id) => delete copy[id]);
        return copy;
      });
      if (ids.includes(activeConversationId)) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Error batch deleting conversations:', err);
    }
  };

  const handleBatchArchiveConversations = async (ids, archived = true) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    try {
      await batchArchiveConversations(ids, archived);
      setConversations((prev) =>
        prev.map((c) => (ids.includes(c.id) ? { ...c, archived: Boolean(archived) } : c))
      );
    } catch (err) {
      console.error('Error batch archiving conversations:', err);
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
    setConversationsMessages({});
    setGeneratingMap({});
    setStreamingReplies({});
    setStreamingStatuses({});
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
    setCurrentUser({
      role: 'admin',
      name: data.name,
      email: data.email,
      picture: data.picture,
      isOwner: Boolean(data.isOwner),
      canEditProjects: Boolean(data.canEditProjects)
    });
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

  // 4. Send Message via Stream with Workspace (cwd) parameter (Independent Per-Chat Concurrency)
  const handleSendMessage = (text, targetWorkspace = activeWorkspace) => {
    if (!text) return;
    const startConvId = activeConversationId;
    const startKey = startConvId || 'new';

    // Only block if THIS specific chat is already executing
    if (generatingMap[startKey]) return;

    const userMsg = {
      role: 'user',
      content: text,
      time: new Date().toISOString()
    };

    setConversationsMessages((prev) => ({
      ...prev,
      [startKey]: [...(prev[startKey] || []), userMsg]
    }));

    setGeneratingMap((prev) => ({ ...prev, [startKey]: true }));
    setStreamingReplies((prev) => ({ ...prev, [startKey]: '' }));
    setStreamingTools((prev) => ({ ...prev, [startKey]: [] }));
    streamingToolsRef.current[startKey] = [];
    setStreamingStatuses((prev) => ({
      ...prev,
      [startKey]:
        currentUser?.role === 'admin'
          ? t.chat.processingAdmin
          : t.chat.processingGuest
    }));

    let accumulatedText = '';
    let currentConvId = startConvId;
    let trackedKey = startKey;
    let pendingDeltaTimer = null;
    let lastFlushTime = 0;

    const flushDelta = () => {
      lastFlushTime = Date.now();
      setStreamingReplies((prev) => {
        if (prev[trackedKey] === accumulatedText) return prev;
        return {
          ...prev,
          [trackedKey]: accumulatedText
        };
      });
      pendingDeltaTimer = null;
    };

    streamChatMessage(
      text,
      currentConvId,
      {
        onInit: (data) => {
          if (data.conversationId && currentUser?.role === 'admin') {
            const assignedId = data.conversationId;
            currentConvId = assignedId;

            // If trackedKey was a draft, migrate tracking to assignedId
            if (trackedKey !== assignedId) {
              const oldKey = trackedKey;
              setGeneratingMap((prev) => {
                const next = { ...prev, [assignedId]: true };
                delete next[oldKey];
                return next;
              });
              setStreamingReplies((prev) => {
                const next = { ...prev, [assignedId]: accumulatedText };
                delete next[oldKey];
                return next;
              });
              setStreamingStatuses((prev) => {
                const next = { ...prev, [assignedId]: prev[oldKey] || '' };
                delete next[oldKey];
                return next;
              });
              setStreamingTools((prev) => {
                const next = { ...prev, [assignedId]: prev[oldKey] || [] };
                delete next[oldKey];
                return next;
              });
              streamingToolsRef.current[assignedId] = streamingToolsRef.current[oldKey] || [];
              delete streamingToolsRef.current[oldKey];

              setConversationsMessages((prev) => {
                const next = { ...prev, [assignedId]: prev[oldKey] || [] };
                delete next[oldKey];
                return next;
              });
              trackedKey = assignedId;

              // Only bind activeConversationId to assignedId if user is still looking at this draft chat
              setActiveConversationId((curActive) => {
                if (curActive === null || curActive === oldKey) {
                  localStorage.setItem('ask_rodrigo_active_conv', assignedId);
                  return assignedId;
                }
                return curActive;
              });

              loadConversations(false);
            }
          }
        },
        onStatus: (data) => {
          setStreamingStatuses((prev) => ({
            ...prev,
            [trackedKey]: data.message || 'Processing...'
          }));
        },
        onDelta: (chunk) => {
          accumulatedText += chunk;
          const now = Date.now();
          // Throttle UI re-renders to 50ms so browser main thread stays responsive for navigation
          if (now - lastFlushTime > 50) {
            flushDelta();
          } else if (!pendingDeltaTimer) {
            pendingDeltaTimer = setTimeout(flushDelta, 50);
          }
        },
        onTool: (toolEvent) => {
          const list = streamingToolsRef.current[trackedKey] ? [...streamingToolsRef.current[trackedKey]] : [];
          const toolItem = {
            stepIndex: toolEvent.stepIndex,
            toolName: toolEvent.toolName || (toolEvent.toolInfo && toolEvent.toolInfo.name),
            parameters: (toolEvent.toolInfo && toolEvent.toolInfo.parameters) || {},
            output: (toolEvent.toolInfo && toolEvent.toolInfo.output) !== undefined ? toolEvent.toolInfo.output : null,
            duration: toolEvent.duration,
            state: toolEvent.state || 'DONE',
            time: new Date().toISOString()
          };
          const existingIdx = list.findIndex(
            (t) => (toolEvent.stepIndex !== undefined && t.stepIndex === toolEvent.stepIndex) ||
                   (t.toolName === toolItem.toolName && t.state === 'ACTIVE')
          );
          if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...toolItem };
          } else {
            list.push(toolItem);
          }
          streamingToolsRef.current[trackedKey] = list;
          setStreamingTools((prev) => ({ ...prev, [trackedKey]: list }));
        },
        onDone: (meta) => {
          if (pendingDeltaTimer) clearTimeout(pendingDeltaTimer);
          const finalReply = accumulatedText || 'Completed.';
          const toolsForThisTurn = streamingToolsRef.current[trackedKey] || [];

          setGeneratingMap((prev) => {
            const next = { ...prev };
            delete next[trackedKey];
            return next;
          });
          setStreamingStatuses((prev) => {
            const next = { ...prev };
            delete next[trackedKey];
            return next;
          });
          setStreamingReplies((prev) => {
            const next = { ...prev };
            delete next[trackedKey];
            return next;
          });
          setStreamingTools((prev) => {
            const next = { ...prev };
            delete next[trackedKey];
            return next;
          });
          delete streamingToolsRef.current[trackedKey];

          const assistantMsg = {
            role: 'assistant',
            content: finalReply,
            time: new Date().toISOString(),
            tools: toolsForThisTurn.length > 0 ? toolsForThisTurn : undefined
          };

          setConversationsMessages((prev) => ({
            ...prev,
            [trackedKey]: [...(prev[trackedKey] || []), assistantMsg]
          }));

          if (currentUser?.role === 'admin') {
            loadConversations(false);
          }

          if (speechEnabled) {
            speakText(finalReply);
          }
        },
        onError: (errMsg) => {
          if (pendingDeltaTimer) clearTimeout(pendingDeltaTimer);
          setGeneratingMap((prev) => {
            const next = { ...prev };
            delete next[trackedKey];
            return next;
          });
          setStreamingStatuses((prev) => {
            const next = { ...prev };
            delete next[trackedKey];
            return next;
          });
          setStreamingReplies((prev) => {
            const next = { ...prev };
            delete next[trackedKey];
            return next;
          });

          const errorMsg = {
            role: 'assistant',
            content: `⚠️ **${t.chat.errorPrefix}**: ${errMsg}`,
            time: new Date().toISOString()
          };

          setConversationsMessages((prev) => ({
            ...prev,
            [trackedKey]: [...(prev[trackedKey] || []), errorMsg]
          }));
        }
      },
      targetWorkspace
    );
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
        onOpenNotes={() => setIsNotesOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        t={t}
      />

      {/* 2. Main Workstation Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Mobile Header (Visible only on screens below md) */}
        <div className="md:hidden flex items-center justify-between px-3 py-2 border-b border-edge bg-panel">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('chat')}
              className="relative h-7 w-7 overflow-hidden rounded-[8px] ring-1 ring-white/10 shadow-sm shrink-0 cursor-pointer hover:opacity-90"
              title="Ask Rodrigo"
            >
              <img src={rodrigoIcon} alt="Ask Rodrigo" className="w-full h-full object-cover" />
            </button>
            <span className="text-sm font-semibold text-ink truncate">Ask Rodrigo</span>
            {activeTab === 'chat' && (
              <button
                onClick={() => setIsDrawerOpen((prev) => !prev)}
                className="p-1 rounded-[6px] text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer"
                title={t.rail?.chat || 'Historial de chats'}
              >
                <MessageSquare className="w-4 h-4 text-accent" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-2 py-1 rounded-[6px] text-xs font-medium transition-colors ${activeTab === 'chat' ? 'bg-accent text-white font-semibold' : 'text-muted'}`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-2 py-1 rounded-[6px] text-xs font-medium transition-colors ${activeTab === 'calendar' ? 'bg-accent text-white font-semibold' : 'text-muted'}`}
            >
              Cal
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('development')}
                className={`px-2 py-1 rounded-[6px] text-xs font-medium transition-colors ${activeTab === 'development' ? 'bg-accent text-white font-semibold' : 'text-muted'}`}
              >
                Dev
              </button>
            )}
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('metrics')}
                className={`px-2 py-1 rounded-[6px] text-xs font-medium transition-colors ${activeTab === 'metrics' ? 'bg-accent text-white font-semibold' : 'text-muted'}`}
              >
                Ops
              </button>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1 rounded-[6px] text-muted hover:text-ink transition-colors"
              title={t.rail?.settings || 'Configuración'}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => (currentUser?.role === 'admin' ? setIsProfileOpen(true) : setIsLoginOpen(true))}
              className="p-1 rounded-[6px] text-muted hover:text-ink transition-colors"
            >
              <User className="w-4 h-4" />
            </button>
            {currentUser?.role === 'admin' && (
              <button
                onClick={handleLogout}
                className="p-1 rounded-[6px] text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                title={t.rail?.logout || 'Cerrar sesión'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
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
                generatingMap={generatingMap}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
                onDeleteConversation={handleDeleteConversation}
                onBatchDeleteConversations={handleBatchDeleteConversations}
                onBatchArchiveConversations={handleBatchArchiveConversations}
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
                messages={conversationsMessages[activeConversationId || 'new'] || []}
                streamingReply={streamingReplies[activeConversationId || 'new'] || ''}
                streamingStatus={streamingStatuses[activeConversationId || 'new'] || ''}
                isGenerating={Boolean(generatingMap[activeConversationId || 'new'])}
                verboseMode={verboseMode}
                onToggleVerboseMode={handleToggleVerboseMode}
                streamingTools={streamingTools[activeConversationId || 'new'] || []}
                onSendMessage={handleSendMessage}
                suggestions={suggestions}
                onSelectSuggestion={(sug) => handleSendMessage(sug, activeWorkspace)}
                speechEnabled={speechEnabled}
                onSpeakText={speakText}
                currentUser={currentUser}
                activeWorkspace={activeWorkspace}
                onSelectWorkspace={handleSelectWorkspace}
                isDrawerOpen={isDrawerOpen}
                onToggleDrawer={() => setIsDrawerOpen((prev) => !prev)}
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
          ) : activeTab === 'development' ? (
            <DeveloperView
              currentUser={currentUser}
              t={t}
              isDockVisible={isDockVisible}
              onToggleDock={handleToggleDock}
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

      </div>

      {/* Floating Quick Dock (Bottom-Right - Quick Access) */}
      <FloatingDock
        currentLanguage={language}
        onToggleLanguage={() => handleChangeLanguage(language === 'en' ? 'es' : 'en')}
        speechEnabled={speechEnabled}
        onToggleSpeech={handleToggleSpeech}
        isSubagentsOpen={isSubagentsOpen}
        onToggleSubagents={() => setIsSubagentsOpen((prev) => !prev)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isAdmin={currentUser?.role === 'admin'}
        isVisible={isDockVisible}
        onToggleVisible={handleToggleDock}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profileData={profileData}
        currentLanguage={language}
        t={t}
      />

      {/* Admin Notes & Prompts Modal */}
      <NotesModal
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        onInsertPrompt={(promptText) => {
          setActiveTab('chat');
          window.dispatchEvent(new CustomEvent('insert_chat_prompt', { detail: { text: promptText } }));
        }}
        t={t}
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
        verboseMode={verboseMode}
        onToggleVerboseMode={handleToggleVerboseMode}
        health={health}
        currentUser={currentUser}
        t={t}
      />
    </div>
  );
}
