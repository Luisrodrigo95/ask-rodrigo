import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  LogOut,
  MessageSquare,
  Settings,
  Plus,
  CalendarDays,
  Clock,
  CodeXml,
  Cpu
} from 'lucide-react';
import { PrimaryRail } from './components/PrimaryRail';
import { SessionDrawer } from './components/SessionDrawer';
import { SubagentPanel } from './components/SubagentPanel';
import { FloatingDock } from './components/FloatingDock';
import { ChatView } from './components/ChatView';
import { MetricsView } from './components/MetricsView';
import { CalendarView } from './components/CalendarView';
import { DeveloperView } from './components/DeveloperView';
import { ClockView } from './components/ClockView';
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
  stopChatMessage,
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

  // AI Model & Thinking Effort (low, medium, high) states
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('ask_rodrigo_model') || 'gemini-3.8-flash');
  const [thinkingEffort, setThinkingEffort] = useState(() => localStorage.getItem('ask_rodrigo_effort') || 'high');

  const handleChangeModel = (model) => {
    setSelectedModel(model);
    localStorage.setItem('ask_rodrigo_model', model);
  };

  const handleChangeEffort = (effort) => {
    setThinkingEffort(effort);
    localStorage.setItem('ask_rodrigo_effort', effort);
  };

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
  const [isRefreshingChats, setIsRefreshingChats] = useState(false);

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
  const abortControllersRef = useRef({});

  const handleToggleVerboseMode = () => {
    setVerboseMode((prev) => {
      const next = !prev;
      localStorage.setItem('ask_rodrigo_verbose_mode', String(next));
      return next;
    });
  };

  // Clock & Work Session Timer State (Persisted)
  const [clockSeconds, setClockSeconds] = useState(() => {
    const saved = localStorage.getItem('ask_rodrigo_clock_seconds');
    return saved !== null ? parseInt(saved, 10) || 0 : 7544;
  });
  const [isClockRunning, setIsClockRunning] = useState(() => {
    const saved = localStorage.getItem('ask_rodrigo_clock_running');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    if (!isClockRunning) return;
    const interval = setInterval(() => {
      setClockSeconds((prev) => {
        const next = prev + 1;
        localStorage.setItem('ask_rodrigo_clock_seconds', String(next));
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isClockRunning]);

  const handleStartClock = () => {
    setIsClockRunning(true);
    localStorage.setItem('ask_rodrigo_clock_running', 'true');
  };

  const handleStopClock = () => {
    setIsClockRunning(false);
    localStorage.setItem('ask_rodrigo_clock_running', 'false');
  };

  const handleEditClock = (newSeconds) => {
    const safe = Math.max(0, Math.floor(newSeconds || 0));
    setClockSeconds(safe);
    localStorage.setItem('ask_rodrigo_clock_seconds', String(safe));
  };

  const handleResetClock = () => {
    setClockSeconds(0);
    localStorage.setItem('ask_rodrigo_clock_seconds', '0');
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
    // If switching away from an empty unsent draft, discard it from the list
    if (activeConversationId && activeConversationId.startsWith('draft-') && activeConversationId !== id) {
      const msgs = conversationsMessages[activeConversationId] || [];
      if (msgs.length === 0 && !generatingMap[activeConversationId]) {
        setConversations((prev) => prev.filter((c) => c.id !== activeConversationId));
      }
    }

    setActiveConversationId(id);
    localStorage.setItem('ask_rodrigo_active_conv', id);
    setActiveTab('chat');

    // Only fetch if not currently streaming to avoid overwriting live background generation
    if (!generatingMap[id] && !id.startsWith('draft-')) {
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
      
      // Preserve any active draft currently in progress
      setConversations((prev) => {
        const activeDraft = prev.find((c) => c.isDraft || (c.id && c.id.startsWith('draft-')));
        if (activeDraft && !list.some((c) => c.id === activeDraft.id)) {
          return [activeDraft, ...list];
        }
        return list;
      });

      const savedConv = localStorage.getItem('ask_rodrigo_active_conv');
      if (autoSelect && !activeConversationId && savedConv) {
        handleSelectConversation(savedConv);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setConversationsLoading(false);
    }
  };

  const handleRefreshChats = async () => {
    if (currentUser?.role !== 'admin') return;
    setIsRefreshingChats(true);
    try {
      // 1. Refresh conversations list from server without re-selecting
      await loadConversations(false);

      // 2. If an active conversation exists, sync its latest messages from the transcript
      if (activeConversationId && !activeConversationId.startsWith('draft-')) {
        const detail = await fetchConversationDetail(activeConversationId);
        if (detail && Array.isArray(detail.messages) && detail.messages.length > 0) {
          const lastMsg = detail.messages[detail.messages.length - 1];
          // If the server finished and responded with an assistant reply, clear any leftover generating state
          if (lastMsg?.role === 'assistant' && generatingMap[activeConversationId]) {
            setGeneratingMap((prev) => {
              const next = { ...prev };
              delete next[activeConversationId];
              return next;
            });
            setStreamingStatuses((prev) => {
              const next = { ...prev };
              delete next[activeConversationId];
              return next;
            });
            setStreamingReplies((prev) => {
              const next = { ...prev };
              delete next[activeConversationId];
              return next;
            });
          }

          // Update messages if not actively generating or if turn completed
          if (!generatingMap[activeConversationId] || lastMsg?.role === 'assistant') {
            setConversationsMessages((prev) => ({
              ...prev,
              [activeConversationId]: detail.messages
            }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to refresh chats:', err);
    } finally {
      setIsRefreshingChats(false);
    }
  };

  const handleNewChat = () => {
    // If current conversation is already an empty draft, keep focus there
    if (activeConversationId && activeConversationId.startsWith('draft-')) {
      const msgs = conversationsMessages[activeConversationId] || [];
      if (msgs.length === 0 && !generatingMap[activeConversationId]) {
        setActiveTab('chat');
        return;
      }
    }

    const defaultTitle = t?.drawer?.newChatTitle || (language === 'es' ? 'Nuevo chat' : 'New chat');
    const defaultSnippet = t?.drawer?.noPreview || (language === 'es' ? 'Sin vista previa' : 'No preview available');
    const draftId = `draft-${Date.now()}`;

    const draftConv = {
      id: draftId,
      title: defaultTitle,
      snippet: defaultSnippet,
      preview: defaultSnippet,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      stepCount: 0,
      isDraft: true
    };

    setActiveConversationId(draftId);
    localStorage.setItem('ask_rodrigo_active_conv', draftId);
    setActiveTab('chat');

    if (currentUser?.role === 'admin') {
      setConversations((prev) => [draftConv, ...prev.filter((c) => c.id !== draftId)]);
    }

    setConversationsMessages((prev) => ({ ...prev, [draftId]: [] }));
    setStreamingReplies((prev) => ({ ...prev, [draftId]: '' }));
    setStreamingStatuses((prev) => ({ ...prev, [draftId]: '' }));
    setStreamingTools((prev) => ({ ...prev, [draftId]: [] }));
  };

  const handleDeleteConversation = async (id) => {
    try {
      if (!id.startsWith('draft-')) {
        await deleteConversation(id);
      }
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
      setStreamingTools((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      if (abortControllersRef.current[id]) {
        try { abortControllersRef.current[id](); } catch {}
        delete abortControllersRef.current[id];
      }
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
      const realIds = ids.filter((id) => !id.startsWith('draft-'));
      if (realIds.length > 0) {
        await batchDeleteConversations(realIds);
      }
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
      setStreamingTools((prev) => {
        const copy = { ...prev };
        ids.forEach((id) => delete copy[id]);
        return copy;
      });
      ids.forEach((id) => {
        if (abortControllersRef.current[id]) {
          try { abortControllersRef.current[id](); } catch {}
          delete abortControllersRef.current[id];
        }
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
      const realIds = ids.filter((id) => !id.startsWith('draft-'));
      if (realIds.length > 0) {
        await batchArchiveConversations(realIds, archived);
      }
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

    if (startConvId && startConvId.startsWith('draft-')) {
      const cleanSnippet = text.trim().replace(/\s+/g, ' ');
      const autoTitle = cleanSnippet.length > 36 ? cleanSnippet.slice(0, 36) + '...' : cleanSnippet;
      const autoSnippet = cleanSnippet.length > 80 ? cleanSnippet.slice(0, 80) + '...' : cleanSnippet;
      setConversations((prev) =>
        prev.map((c) =>
          c.id === startConvId
            ? { ...c, title: autoTitle, snippet: autoSnippet, preview: autoSnippet, updatedAt: new Date().toISOString() }
            : c
        )
      );
    }

    const abortFn = streamChatMessage(
      text,
      currentConvId && currentConvId.startsWith('draft-') ? null : currentConvId,
      {
        onInit: (data) => {
          if (data.conversationId && currentUser?.role === 'admin') {
            const assignedId = data.conversationId;
            currentConvId = assignedId;

            // If trackedKey was a draft, migrate tracking to assignedId
            if (trackedKey !== assignedId) {
              const oldKey = trackedKey;
              if (abortControllersRef.current[oldKey]) {
                abortControllersRef.current[assignedId] = abortControllersRef.current[oldKey];
                delete abortControllersRef.current[oldKey];
              }

              setConversations((prev) =>
                prev.map((c) => (c.id === oldKey ? { ...c, id: assignedId, isDraft: false } : c))
              );

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
          delete abortControllersRef.current[trackedKey];
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
          delete abortControllersRef.current[trackedKey];
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
      {
        workspace: targetWorkspace,
        model: selectedModel,
        effort: thinkingEffort
      }
    );

    abortControllersRef.current[startKey] = abortFn;
  };

  const handleStopGeneration = async (chatId) => {
    const targetId = chatId || activeConversationId || 'new';

    // 1. Abort local fetch stream
    if (abortControllersRef.current[targetId]) {
      try {
        abortControllersRef.current[targetId]();
      } catch (e) {
        console.warn('Error aborting local stream:', e);
      }
      delete abortControllersRef.current[targetId];
    }

    // 2. Call backend stop endpoint to kill process
    if (currentUser?.role === 'admin' && !targetId.startsWith('draft-') && targetId !== 'new') {
      try {
        await stopChatMessage(targetId);
      } catch (e) {
        console.warn('Error sending stop to backend:', e);
      }
    }

    // 3. Clear generating flags
    const partialText = streamingReplies[targetId] || '';
    const toolsForThisTurn = streamingToolsRef.current[targetId] || [];

    setGeneratingMap((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    setStreamingStatuses((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    setStreamingReplies((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    setStreamingTools((prev) => {
      const next = { ...prev };
      delete next[targetId];
      return next;
    });
    delete streamingToolsRef.current[targetId];

    // 4. Append partial response if any, marked as stopped
    if (partialText.trim()) {
      const stoppedNotice = t.chat?.responseStopped || (language === 'es' ? '(Respuesta detenida por el usuario)' : '(Response stopped by user)');
      const assistantMsg = {
        role: 'assistant',
        content: `${partialText.trim()}\n\n*${stoppedNotice}*`,
        time: new Date().toISOString(),
        tools: toolsForThisTurn.length > 0 ? toolsForThisTurn : undefined
      };

      setConversationsMessages((prev) => ({
        ...prev,
        [targetId]: [...(prev[targetId] || []), assistantMsg]
      }));
    }
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
    <div className="flex h-[100dvh] h-full w-full max-w-[100vw] bg-paper text-ink overflow-hidden select-none">
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
        clockSeconds={clockSeconds}
        isClockRunning={isClockRunning}
        t={t}
      />

      {/* 2. Main Workstation Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 min-h-0">
        {/* Mobile Header (Visible only on screens below md) */}
        <div className="md:hidden flex items-center justify-between px-3.5 py-2.5 border-b border-edge bg-panel/95 backdrop-blur-md select-none shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setActiveTab('chat')}
              className="relative h-8 w-8 overflow-hidden rounded-xl ring-1 ring-white/10 shadow-sm shrink-0 cursor-pointer hover:opacity-90 transition-all active:scale-95"
              title="Ask Rodrigo"
            >
              <img src={rodrigoIcon} alt="Ask Rodrigo" className="w-full h-full object-cover" />
            </button>
            <div className="flex flex-col min-w-0">
              <span className="text-[14px] font-semibold text-ink leading-tight truncate">Ask Rodrigo</span>
              <span className="text-[10px] font-mono text-muted flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {currentUser?.role === 'admin' ? 'Admin' : (language === 'es' ? 'Invitado' : 'Guest')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activeTab === 'chat' && (
              <button
                type="button"
                onClick={() => setIsDrawerOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                  isDrawerOpen
                    ? 'bg-accent/15 border-accent text-accent shadow-xs'
                    : 'bg-sunken border-edge text-muted hover:text-ink'
                }`}
                title={t.rail?.chats || (language === 'es' ? 'Chats' : 'Chats')}
                aria-label="Abrir chats"
              >
                <MessageSquare className="w-4 h-4 text-accent" />
                <span className="text-xs font-medium text-ink">{t.rail?.chats || 'Chats'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => (currentUser?.role === 'admin' ? setIsProfileOpen(true) : setIsLoginOpen(true))}
              className="p-2 rounded-xl bg-sunken border border-edge text-muted hover:text-ink transition-all active:scale-95 cursor-pointer"
              title={currentUser?.role === 'admin' ? (t.header?.profileBtn || 'Perfil') : (t.sidebar?.loginBtn || 'Iniciar Sesión')}
            >
              <User className="w-4 h-4" />
            </button>

            {currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl bg-sunken border border-edge text-muted hover:text-rose-400 hover:border-rose-500/40 transition-all active:scale-95 cursor-pointer"
                title={t.rail?.logout || (language === 'es' ? 'Cerrar sesión' : 'Sign Out')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-1 flex overflow-hidden min-w-0 min-h-0">
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
                onRefreshChats={handleRefreshChats}
                isRefreshing={isRefreshingChats || conversationsLoading}
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
                onStopGeneration={() => handleStopGeneration(activeConversationId || 'new')}
                verboseMode={verboseMode}
                onToggleVerboseMode={handleToggleVerboseMode}
                streamingTools={streamingTools[activeConversationId || 'new'] || []}
                selectedModel={selectedModel}
                onChangeModel={handleChangeModel}
                thinkingEffort={thinkingEffort}
                onChangeThinkingEffort={handleChangeEffort}
                onSendMessage={handleSendMessage}
                onRefreshChats={handleRefreshChats}
                isRefreshing={isRefreshingChats || conversationsLoading}
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
                language={language}
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
          ) : activeTab === 'clock' ? (
            <ClockView
              secondsElapsed={clockSeconds}
              isRunning={isClockRunning}
              onStart={handleStartClock}
              onStop={handleStopClock}
              onEdit={handleEditClock}
              onReset={handleResetClock}
              currentUser={currentUser}
              t={t}
            />
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

        {/* iOS Mobile Bottom Navigation Bar (Visible only on screens below md) */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden shrink-0 flex items-center justify-around px-2 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] bg-panel/95 backdrop-blur-xl border-t border-edge z-30 select-none shadow-lg"
        >
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center min-w-[54px] py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'text-accent font-semibold scale-105'
                : 'text-muted hover:text-ink'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'chat' ? 'bg-accent/15' : ''}`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{t.rail?.chats || 'Chat'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center justify-center min-w-[54px] py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'calendar'
                ? 'text-accent font-semibold scale-105'
                : 'text-muted hover:text-ink'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeTab === 'calendar' ? 'bg-accent/15' : ''}`}>
              <CalendarDays className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{t.rail?.calendar || 'Cal'}</span>
          </button>

          {currentUser?.role === 'admin' && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('clock')}
                className={`flex flex-col items-center justify-center min-w-[54px] py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'clock'
                    ? 'text-accent font-semibold scale-105'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <div className={`p-1 rounded-lg ${activeTab === 'clock' ? 'bg-accent/15' : ''}`}>
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{t.rail?.clock || 'Clock'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('development')}
                className={`flex flex-col items-center justify-center min-w-[54px] py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'development'
                    ? 'text-accent font-semibold scale-105'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <div className={`p-1 rounded-lg ${activeTab === 'development' ? 'bg-accent/15' : ''}`}>
                  <CodeXml className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{t.rail?.development || 'Dev'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('metrics')}
                className={`flex flex-col items-center justify-center min-w-[54px] py-1 px-1.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'metrics'
                    ? 'text-accent font-semibold scale-105'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <div className={`p-1 rounded-lg ${activeTab === 'metrics' ? 'bg-accent/15' : ''}`}>
                  <Cpu className="w-5 h-5" />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{t.rail?.metrics || 'Ops'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex flex-col items-center justify-center min-w-[54px] py-1 px-1.5 rounded-xl text-muted hover:text-ink transition-all cursor-pointer"
          >
            <div className="p-1 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">{t.rail?.settings || 'Ajustes'}</span>
          </button>
        </nav>
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
