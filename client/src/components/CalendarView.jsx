import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  Search,
  RefreshCw,
  X,
  Server,
  FileCheck,
  Code2,
  User,
  AlertCircle,
  Lock,
  Layers,
  FolderKanban,
  CheckSquare,
  Sparkles,
  Filter,
  Copy,
  Check,
  ExternalLink,
  Download,
  Radio,
  Zap,
  Tag,
  Building,
  CheckCircle2
} from 'lucide-react';

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatDateISO(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const HOUR_WIDTH = 72;
const CARD_HEIGHT = 34;
const CARD_GAP = 4;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return Math.min(1440, Math.max(0, h * 60 + m));
}

function layoutDayEvents(events, hourWidth = HOUR_WIDTH) {
  if (!events || events.length === 0) {
    return { placed: [], rowHeight: 84 };
  }

  const parsed = events.map((evt) => {
    let startMin = 9 * 60;
    let endMin = 10 * 60;

    if (evt.eventType === 'absence') {
      startMin = 0;
      endMin = 1440;
    } else if (evt.time) {
      const parts = evt.time.split(/[-–—]/);
      if (parts.length >= 2) {
        const sm = parseTimeToMinutes(parts[0].trim());
        const em = parseTimeToMinutes(parts[1].trim());
        if (sm !== null) startMin = sm;
        if (em !== null) endMin = em;
        else endMin = startMin + 60;
      } else {
        const sm = parseTimeToMinutes(evt.time.trim());
        if (sm !== null) {
          startMin = sm;
          endMin = startMin + 60;
        }
      }
    } else {
      startMin = 9 * 60;
      endMin = 17 * 60;
    }

    if (endMin <= startMin) {
      endMin = Math.min(1440, startMin + 45);
    }

    return {
      evt,
      startMin,
      endMin
    };
  });

  // Sort by startMin, then duration descending
  parsed.sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));

  const lanes = [];

  const placed = parsed.map((item) => {
    let assignedLane = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i] <= item.startMin) {
        assignedLane = i;
        lanes[i] = item.endMin;
        break;
      }
    }
    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push(item.endMin);
    }

    const left = (item.startMin / 60) * hourWidth;
    const rawWidth = ((item.endMin - item.startMin) / 60) * hourWidth;
    const width = Math.min(24 * hourWidth - left, Math.max(rawWidth, 105));
    const top = 10 + assignedLane * (CARD_HEIGHT + CARD_GAP);

    return {
      ...item,
      lane: assignedLane,
      left,
      width,
      top,
      height: CARD_HEIGHT
    };
  });

  const rowHeight = Math.max(84, 16 + (lanes.length || 1) * (CARD_HEIGHT + CARD_GAP) + 10);

  return { placed, rowHeight };
}

export function CalendarView({
  events = [],
  onCreateEvent,
  onDeleteEvent,
  loading,
  currentUser,
  t
}) {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week' | 'day' | 'month'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [showModal, setShowModal] = useState(false);
  const [showIcsModal, setShowIcsModal] = useState(false);
  const [showAddLayerModal, setShowAddLayerModal] = useState(false);
  const [copiedIcs, setCopiedIcs] = useState(false);
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);

  // Dynamic Layers & Teams (Persisted in localStorage so Rodrigo can add whatever he wants)
  const defaultLayers = [
    { id: 'server', name: 'VPS & Infrastructure', icon: 'server', color: 'teal' },
    { id: 'consular', name: 'Consular & Immigration', icon: 'consular', color: 'purple' },
    { id: 'projects', name: 'Projects & Development', icon: 'projects', color: 'accent' },
    { id: 'personal', name: 'Personal & Reminders', icon: 'personal', color: 'amber' }
  ];

  const defaultGroups = [
    { id: 'askrodrigo', name: 'Ask-Rodrigo (AGy Suite)' },
    { id: 'portfolio', name: 'therodrigo.com (Portfolio)' },
    { id: 'preswin', name: 'PresWin Cost Estimator' },
    { id: 'totimigraciones', name: 'TotiMigraciones Portal' },
    { id: 'appointment_checker', name: 'Appointment Checker (Daemon)' },
    { id: 'infrastructure', name: 'Debian 13 VPS Daemons' }
  ];

  const [layersList, setLayersList] = useState(() => {
    try {
      const saved = localStorage.getItem('ask_rodrigo_custom_layers');
      return saved ? JSON.parse(saved) : defaultLayers;
    } catch {
      return defaultLayers;
    }
  });

  const [groupsList, setGroupsList] = useState(() => {
    try {
      const saved = localStorage.getItem('ask_rodrigo_custom_groups');
      return saved ? JSON.parse(saved) : defaultGroups;
    } catch {
      return defaultGroups;
    }
  });

  // Filter Checkbox States
  const [onlyMyEvents, setOnlyMyEvents] = useState(false);
  const [activeLayers, setActiveLayers] = useState(() => {
    const state = {};
    layersList.forEach((l) => { state[l.id] = true; });
    return state;
  });

  const [activeGroups, setActiveGroups] = useState(() => {
    const state = {};
    groupsList.forEach((g) => { state[g.id] = true; });
    return state;
  });

  // Additional Ask Marvin filters
  const [showShifts, setShowShifts] = useState(true);
  const [showAbsences, setShowAbsences] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);

  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Servidor');
  const [customCategory, setCustomCategory] = useState('');
  const [newLayer, setNewLayer] = useState('server');
  const [newGroup, setNewGroup] = useState('infrastructure');
  const [newDate, setNewDate] = useState(formatDateISO(new Date()));
  const [newTime, setNewTime] = useState('10:00');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newIsPrivate, setNewIsPrivate] = useState(false);
  const [newEventType, setNewEventType] = useState('standard'); // 'standard' | 'shift' | 'absence'

  // Add Layer/Team Modal State
  const [layerOrTeamType, setLayerOrTeamType] = useState('layer'); // 'layer' | 'group'
  const [newCustomName, setNewCustomName] = useState('');

  const feedUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/ask-rodrigo/api/calendar.ics`
    : 'https://therodrigo.com/ask-rodrigo/api/calendar.ics';

  const handleCopyIcsUrl = () => {
    navigator.clipboard?.writeText(feedUrl);
    setCopiedIcs(true);
    setTimeout(() => setCopiedIcs(false), 2500);
  };

  const isAdmin = currentUser?.role === 'admin';
  const clt = t?.calendar || {
    title: "Rodrigo's Calendar",
    subtitle: "Consular appointments, scheduled VPS maintenance, and milestones.",
    newEvent: "New Event",
    viewMonth: "Month",
    viewWeek: "Week",
    viewDay: "Day",
    todayBtn: "Today",
    searchPlaceholder: "Search calendar...",
    noEventsDay: "No events scheduled for this day"
  };

  // Timer for the Live "Now" line updating every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const weekTimelineRef = useRef(null);

  // Auto-scroll weekly grid horizontally to the current hour on mount/week switch
  useEffect(() => {
    if (viewMode === 'week' && weekTimelineRef.current) {
      const nowH = new Date().getHours();
      const targetHour = Math.max(0, Math.min(nowH - 1, 16));
      setTimeout(() => {
        if (weekTimelineRef.current) {
          weekTimelineRef.current.scrollLeft = targetHour * HOUR_WIDTH;
        }
      }, 50);
    }
  }, [viewMode, selectedDate]);

  const handleCellClick = (dayIso, hour) => {
    if (!isAdmin) return;
    setNewDate(dayIso);
    setNewTime(`${String(hour).padStart(2, '0')}:00`);
    setShowModal(true);
  };

  const handleScrollToNow = () => {
    if (weekTimelineRef.current) {
      const nowH = new Date().getHours();
      weekTimelineRef.current.scrollTo({
        left: Math.max(0, (nowH - 1) * HOUR_WIDTH),
        behavior: 'smooth'
      });
    }
  };

  const currentHour = currentTime.getHours();
  const nowPositionLeft = useMemo(() => {
    const mins = currentTime.getHours() * 60 + currentTime.getMinutes();
    return (mins / 60) * HOUR_WIDTH;
  }, [currentTime]);

  // Compute the 7 days of the active week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const monday = getMonday(selectedDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate]);

  // Date Range Label in Header
  const dateRangeLabel = useMemo(() => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    if (viewMode === 'day') {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `${dayNames[selectedDate.getDay()]}, ${selectedDate.getDate()} ${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }

    if (viewMode === 'month') {
      const fullMonths = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${fullMonths[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    }

    // Week mode
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]} ${end.getFullYear()}`;
  }, [selectedDate, viewMode, weekDays]);

  // Navigation handlers
  const handlePrev = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'day') d.setDate(d.getDate() - 1);
      else if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
      else d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNext = () => {
    setSelectedDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'day') d.setDate(d.getDate() + 1);
      else if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
      else d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // Layer toggle helpers
  const toggleAllLayers = (val) => {
    const updated = {};
    layersList.forEach((l) => { updated[l.id] = val; });
    setActiveLayers(updated);
  };

  const toggleAllGroups = (val) => {
    const updated = {};
    groupsList.forEach((g) => { updated[g.id] = val; });
    setActiveGroups(updated);
  };

  // Save custom layer or group
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!newCustomName.trim()) return;
    const cleanId = newCustomName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    if (layerOrTeamType === 'layer') {
      const newLayerItem = { id: cleanId, name: newCustomName.trim(), icon: 'tag', color: 'accent' };
      const updated = [...layersList, newLayerItem];
      setLayersList(updated);
      setActiveLayers((prev) => ({ ...prev, [cleanId]: true }));
      localStorage.setItem('ask_rodrigo_custom_layers', JSON.stringify(updated));
    } else {
      const newGroupItem = { id: cleanId, name: newCustomName.trim() };
      const updated = [...groupsList, newGroupItem];
      setGroupsList(updated);
      setActiveGroups((prev) => ({ ...prev, [cleanId]: true }));
      localStorage.setItem('ask_rodrigo_custom_groups', JSON.stringify(updated));
    }

    setNewCustomName('');
    setShowAddLayerModal(false);
  };

  // Filter events based on search, layers, and groups
  const filteredEvents = useMemo(() => {
    if (!events || !Array.isArray(events)) return [];

    let list = [...events];

    // 1. Only my events
    if (onlyMyEvents) {
      list = list.filter((e) => (e.owner || '').toLowerCase().includes('rodrigo'));
    }

    // 2. Layer filtering
    list = list.filter((e) => {
      const layerId = e.layer || (
        (e.category || '').toLowerCase().includes('servidor') ? 'server' :
        (e.category || '').toLowerCase().includes('cita') ? 'consular' :
        (e.category || '').toLowerCase().includes('proyecto') ? 'projects' : 'personal'
      );
      if (activeLayers[layerId] === false) return false;
      return true;
    });

    // 3. Group filtering
    list = list.filter((e) => {
      if (e.group && activeGroups[e.group] === false) return false;
      return true;
    });

    // 4. Search filtering
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((e) => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const cat = (e.category || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || cat.includes(q);
      });
    }

    return list;
  }, [events, onlyMyEvents, activeLayers, activeGroups, searchQuery]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !isAdmin) return;

    const finalCat = newCategory === 'custom' ? (customCategory.trim() || 'General') : newCategory;

    onCreateEvent({
      title: newTitle.trim(),
      category: finalCat,
      layer: newLayer,
      group: newGroup,
      date: newDate,
      time: newTime,
      description: newDescription.trim(),
      priority: newPriority,
      isPrivate: newIsPrivate,
      eventType: newEventType,
      owner: 'Rodrigo García'
    });

    setNewTitle('');
    setCustomCategory('');
    setNewDescription('');
    setShowModal(false);
  };

  const formatCurrentTimeString = () => {
    return currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const renderEventCard = (evt, item) => {
    // 1. Private and non-admin
    if (evt.isPrivate && !isAdmin) {
      return (
        <div
          key={evt.id}
          style={{
            left: `${item.left}px`,
            width: `${item.width}px`,
            top: `${item.top}px`,
            height: `${item.height}px`
          }}
          className="absolute z-10 flex items-center gap-1.5 px-2 rounded-[8px] border border-edge bg-panel/70 opacity-60 grayscale select-none text-[11px] font-mono text-muted shadow-xs"
          title="Private Event"
        >
          <Lock className="w-3 h-3 text-rose-400 shrink-0" />
          <span className="truncate">Private</span>
        </div>
      );
    }

    // 2. Shift / Work Block
    if (evt.eventType === 'shift') {
      return (
        <div
          key={evt.id}
          style={{
            left: `${item.left}px`,
            width: `${item.width}px`,
            top: `${item.top}px`,
            height: `${item.height}px`
          }}
          className="absolute z-10 group flex items-center justify-between gap-1.5 px-2.5 rounded-[8px] bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs shadow-xs hover:z-30 hover:border-amber-400 transition-all cursor-pointer overflow-hidden"
          title={`${evt.title} (${evt.time || '10:00–18:00'}) ${evt.description ? `- ${evt.description}` : ''}`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-mono font-bold text-[10.5px] text-amber-300 shrink-0">
              {evt.time || 'Shift'}
            </span>
            <span className="truncate font-medium">{evt.title}</span>
          </div>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEvent(evt.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-amber-300 hover:text-rose-400 transition-opacity cursor-pointer shrink-0"
              title="Eliminar evento"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    // 3. Absence / Leave
    if (evt.eventType === 'absence') {
      return (
        <div
          key={evt.id}
          style={{
            left: `${item.left}px`,
            width: `${item.width}px`,
            top: `${item.top}px`,
            height: `${item.height}px`
          }}
          className="absolute z-10 group flex items-center justify-between gap-1.5 px-2.5 rounded-[8px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs shadow-xs hover:z-30 hover:border-emerald-400 transition-all cursor-pointer overflow-hidden"
          title={`${evt.title} (Ausencia / Permiso) ${evt.description ? `- ${evt.description}` : ''}`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate font-medium">{evt.title}</span>
          </div>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEvent(evt.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-emerald-300 hover:text-rose-400 transition-opacity cursor-pointer shrink-0"
              title="Eliminar evento"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    // 4. Standard Event / Milestone
    const cat = (evt.category || '').toLowerCase();
    const isServer = cat.includes('servidor') || cat.includes('server') || evt.layer === 'server';
    const isCita = cat.includes('cita') || cat.includes('consular') || evt.layer === 'consular';
    const isDev = cat.includes('project') || cat.includes('desarrollo') || evt.layer === 'projects';

    const colorClasses = isServer
      ? 'bg-teal-500/20 border-teal-500/40 text-teal-200 hover:border-teal-400'
      : isCita
      ? 'bg-purple-500/20 border-purple-500/40 text-purple-200 hover:border-purple-400'
      : isDev
      ? 'bg-accent/20 border-accent/40 text-accent hover:border-accent'
      : 'bg-sky-500/20 border-sky-500/40 text-sky-200 hover:border-sky-400';

    return (
      <div
        key={evt.id}
        style={{
          left: `${item.left}px`,
          width: `${item.width}px`,
          top: `${item.top}px`,
          height: `${item.height}px`
        }}
        className={`absolute z-10 group flex items-center justify-between gap-1.5 px-2 rounded-[8px] border text-xs shadow-xs hover:z-30 transition-all cursor-pointer overflow-hidden ${colorClasses}`}
        title={`${evt.title} (${evt.time || 'Sin hora'}) [${evt.category}] ${evt.description ? `- ${evt.description}` : ''}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {evt.time && (
            <span className="text-[10px] font-mono font-semibold px-1 py-0.2 rounded bg-black/40 shrink-0">
              {evt.time}
            </span>
          )}
          <span className="truncate font-medium text-[11.5px]">{evt.title}</span>
          {evt.isPrivate && <Lock className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
        </div>
        {isAdmin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteEvent(evt.id);
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-rose-400 text-muted hover:bg-rose-500/15 transition-all cursor-pointer shrink-0"
            title="Eliminar evento"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-paper text-ink overflow-hidden select-none">
      {/* 1. Header Toolbar (Ask Marvin Agenda Style) */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-edge bg-panel/70 px-4 py-2.5 backdrop-blur-md">
        {/* Left: Title & Navigation */}
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-[19px] tracking-tight text-ink">
            {clt.title || 'Calendar'}
          </h1>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="rounded-[8px] p-1.5 text-muted hover:text-ink hover:bg-sunken border border-edge/60 transition-colors cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="rounded-[8px] border border-edge/80 px-2.5 py-1 text-xs font-medium text-ink hover:bg-sunken transition-colors cursor-pointer"
            >
              {clt.todayBtn}
            </button>
            <button
              onClick={handleNext}
              className="rounded-[8px] p-1.5 text-muted hover:text-ink hover:bg-sunken border border-edge/60 transition-colors cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-[13px] font-medium text-ink font-mono sm:inline">
            {dateRangeLabel}
          </span>
        </div>

        {/* Right: View Switcher, Search, Meeting & Event CTA */}
        <div className="flex items-center gap-2">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowSidebarMobile(!showSidebarMobile)}
            className="md:hidden p-1.5 rounded-[8px] border border-edge text-muted hover:text-ink"
            title="Filter Layers"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>

          {/* Month / Week / Day Switcher */}
          <div className="flex overflow-hidden rounded-[10px] border border-edge text-xs bg-sunken p-0.5">
            {[
              { id: 'month', label: clt.viewMonth },
              { id: 'week', label: clt.viewWeek },
              { id: 'day', label: clt.viewDay }
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-2.5 py-1 rounded-[8px] text-[11.5px] font-medium transition-colors cursor-pointer ${
                  viewMode === v.id
                    ? 'bg-accent text-white font-semibold shadow-v2-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Quick Search Input */}
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={clt.searchPlaceholder}
              className="w-36 lg:w-44 rounded-[10px] border border-edge bg-panel py-1 pl-8 pr-7 text-xs text-ink placeholder-muted/60 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Instant Meeting Button (Ask Marvin Style) */}
          <a
            href="https://meet.google.com/new"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-[10px] bg-sunken border border-edge/80 px-2.5 py-1.5 text-xs font-medium text-ink hover:text-accent hover:border-accent/40 transition-all cursor-pointer shadow-v2-sm"
            title="Start instant video meeting"
          >
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span className="hidden lg:inline">Start Meeting</span>
          </a>

          {/* iCal Subscription Button */}
          <button
            onClick={() => setShowIcsModal(true)}
            className="flex items-center gap-1.5 rounded-[10px] bg-sunken border border-edge/80 px-2.5 py-1.5 text-xs font-medium text-ink hover:text-accent hover:border-accent/40 transition-all cursor-pointer shadow-v2-sm"
            title="Suscripción iCal (.ics) & Google Calendar"
          >
            <Radio className="w-3.5 h-3.5 text-accent" />
            <span className="hidden sm:inline">iCal Feed</span>
          </button>

          {/* New Event Button (Admin Only) */}
          {isAdmin ? (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 transition-all shadow-v2-sm active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{clt.newEvent}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] bg-sunken border border-edge text-muted text-xs">
              <Lock className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Read-Only</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. Workspace Layout: Sidebar (Layers & Groups) + Main Agenda Feed */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Filter & Layers Aside (224px, Ask Marvin Pattern) */}
        <aside
          className={`${
            showSidebarMobile ? 'block absolute z-30 inset-y-0 left-0 bg-paper' : 'hidden'
          } md:block w-56 shrink-0 overflow-y-auto border-r border-edge p-3 text-xs space-y-3.5 bg-paper/60 backdrop-blur-sm [scrollbar-width:none]`}
        >
          {/* Quick Filter: Only my events */}
          <label className="flex cursor-pointer items-center gap-2 rounded-[10px] border px-2.5 py-2 font-medium border-edge bg-panel/70 hover:bg-sunken transition-colors">
            <input
              type="checkbox"
              checked={onlyMyEvents}
              onChange={(e) => setOnlyMyEvents(e.target.checked)}
              className="rounded accent-teal-500 cursor-pointer"
            />
            <span className="text-[12px] text-ink font-semibold">Only my events</span>
          </label>

          {/* Dynamic Layers Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-1">
              <span className="font-semibold text-[11px] uppercase tracking-wider text-muted flex items-center gap-1">
                <Layers className="w-3 h-3 text-accent" /> Layers
              </span>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  onClick={() => toggleAllLayers(true)}
                  className="rounded border border-edge px-1.5 py-0.5 hover:bg-sunken text-muted hover:text-ink cursor-pointer"
                >
                  all
                </button>
                <button
                  onClick={() => toggleAllLayers(false)}
                  className="rounded border border-edge px-1.5 py-0.5 hover:bg-sunken text-muted hover:text-ink cursor-pointer"
                >
                  none
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setLayerOrTeamType('layer');
                      setShowAddLayerModal(true);
                    }}
                    className="p-1 rounded text-accent hover:bg-sunken cursor-pointer"
                    title="Add custom layer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {layersList.map((layer) => (
              <label key={layer.id} className="flex cursor-pointer items-center gap-2 py-1 text-ink/80 hover:text-ink">
                <input
                  type="checkbox"
                  checked={Boolean(activeLayers[layer.id])}
                  onChange={(e) => setActiveLayers((p) => ({ ...p, [layer.id]: e.target.checked }))}
                  className="rounded accent-teal-500 cursor-pointer"
                />
                {layer.icon === 'server' ? (
                  <Server className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                ) : layer.icon === 'consular' ? (
                  <FileCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                ) : layer.icon === 'projects' ? (
                  <Code2 className="w-3.5 h-3.5 text-accent shrink-0" />
                ) : (
                  <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span className="truncate">{layer.name}</span>
              </label>
            ))}
          </div>

          {/* Dynamic Project Groups / Workspaces */}
          <div className="space-y-1 pt-2 border-t border-edge/60">
            <div className="flex items-center justify-between pb-1">
              <span className="font-semibold text-[11px] uppercase tracking-wider text-muted flex items-center gap-1">
                <FolderKanban className="w-3 h-3 text-accent" /> Teams & Projects
              </span>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  onClick={() => toggleAllGroups(true)}
                  className="rounded border border-edge px-1.5 py-0.5 hover:bg-sunken text-muted hover:text-ink cursor-pointer"
                >
                  all
                </button>
                <button
                  onClick={() => toggleAllGroups(false)}
                  className="rounded border border-edge px-1.5 py-0.5 hover:bg-sunken text-muted hover:text-ink cursor-pointer"
                >
                  none
                </button>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setLayerOrTeamType('group');
                      setShowAddLayerModal(true);
                    }}
                    className="p-1 rounded text-accent hover:bg-sunken cursor-pointer"
                    title="Add custom team/project"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {groupsList.map((g) => (
              <label key={g.id} className="flex cursor-pointer items-center gap-2 py-1 text-ink/80 hover:text-ink">
                <input
                  type="checkbox"
                  checked={Boolean(activeGroups[g.id])}
                  onChange={(e) => setActiveGroups((p) => ({ ...p, [g.id]: e.target.checked }))}
                  className="rounded accent-teal-500 cursor-pointer"
                />
                <span className="truncate text-[11.5px]">{g.name}</span>
              </label>
            ))}
          </div>

          {/* Ask Marvin Event Type Flags */}
          <div className="space-y-1 pt-2 border-t border-edge/60">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-muted block pb-1">
              Event Types
            </span>
            <label className="flex cursor-pointer items-center gap-2 py-0.5 text-ink/80 hover:text-ink">
              <input
                type="checkbox"
                checked={showShifts}
                onChange={(e) => setShowShifts(e.target.checked)}
                className="rounded accent-teal-500 cursor-pointer"
              />
              <span className="text-[11.5px]">Work blocks / Shifts</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 py-0.5 text-ink/80 hover:text-ink">
              <input
                type="checkbox"
                checked={showAbsences}
                onChange={(e) => setShowAbsences(e.target.checked)}
                className="rounded accent-teal-500 cursor-pointer"
              />
              <span className="text-[11.5px]">Absences & Leave</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 py-0.5 text-ink/80 hover:text-ink">
              <input
                type="checkbox"
                checked={showMilestones}
                onChange={(e) => setShowMilestones(e.target.checked)}
                className="rounded accent-teal-500 cursor-pointer"
              />
              <span className="text-[11.5px]">Milestones & Tasks</span>
            </label>
          </div>

          {/* Private Schedule Marker */}
          <div className="pt-2 border-t border-edge/60">
            <div className="flex items-center justify-between text-[11px] font-semibold text-muted mb-1">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-rose-400" /> Private Calendar
              </span>
            </div>
            <div className="flex items-center gap-2 py-1 text-[11.5px] text-ink font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="truncate">Rodrigo García (Owner)</span>
            </div>
          </div>
        </aside>

        {/* Main Agenda Timeline Container */}
        <main className={`min-w-0 flex-1 ${viewMode === 'week' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto [scrollbar-width:thin]'}`}>
          {/* VIEW 1: WEEK MATRIX GRID (Days as Rows, Hours as Columns) */}
          {viewMode === 'week' && (
            <div
              ref={weekTimelineRef}
              className="flex-1 overflow-x-auto overflow-y-auto [scrollbar-width:thin] select-none bg-paper"
            >
              <div className="inline-block min-w-full">
                {/* Top Sticky Header: Corner + 24 Hours */}
                <div className="flex border-b border-edge bg-panel/95 backdrop-blur-xs sticky top-0 z-30">
                  <div className="sticky left-0 z-40 bg-panel border-r border-edge w-36 sm:w-44 shrink-0 px-3 py-2 flex items-center justify-between shadow-xs">
                    <span className="text-[11px] font-mono font-semibold text-muted uppercase tracking-wider">
                      {clt.dayCol || 'Día \\ Horas'}
                    </span>
                    <button
                      onClick={handleScrollToNow}
                      className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-accent/15 text-accent hover:bg-accent/25 border border-accent/30 transition-colors cursor-pointer"
                      title="Saltar a la hora actual"
                    >
                      Ahora
                    </button>
                  </div>
                  <div className="grid grid-cols-[repeat(24,72px)] shrink-0">
                    {HOURS.map((h) => {
                      const isNowHour = currentHour === h;
                      return (
                        <div
                          key={h}
                          className={`h-9 flex items-center justify-center border-r border-edge/40 text-xs font-mono font-medium transition-colors ${
                            isNowHour
                              ? 'text-accent font-bold bg-accent/10 border-b-2 border-b-accent'
                              : 'text-muted/80'
                          }`}
                        >
                          <span>{String(h).padStart(2, '0')}:00</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 7 Day Rows */}
                <div className="divide-y divide-edge">
                  {weekDays.map((dayDate) => {
                    const dayIso = formatDateISO(dayDate);
                    const isToday = isSameDay(dayDate, new Date());
                    const isEs = (t?.calendar?.todayBtn === 'Hoy') || (clt.todayBtn === 'Hoy');
                    const dayShortName = dayDate.toLocaleDateString(isEs ? 'es-ES' : 'en-US', { weekday: 'short' });
                    const dayNum = dayDate.getDate();
                    const monthName = dayDate.toLocaleDateString(isEs ? 'es-ES' : 'en-US', { month: 'short' });

                    const dayEvents = filteredEvents.filter((e) => e.date === dayIso);
                    const { placed, rowHeight } = layoutDayEvents(dayEvents, HOUR_WIDTH);

                    return (
                      <div
                        key={dayIso}
                        style={{ minHeight: `${rowHeight}px` }}
                        className={`flex relative transition-colors ${isToday ? 'bg-accent/[0.02]' : 'hover:bg-panel/10'}`}
                      >
                        {/* Left Sticky Day Cell */}
                        <div className={`sticky left-0 z-20 bg-panel border-r border-edge w-36 sm:w-44 shrink-0 px-3 py-2.5 flex flex-col justify-center shadow-xs select-none ${
                          isToday ? 'border-l-4 border-l-accent' : ''
                        }`}>
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-semibold capitalize ${isToday ? 'text-accent font-bold' : 'text-ink'}`}>
                              {dayShortName} {dayNum}
                            </span>
                            {isToday && (
                              <span className="rounded-[5px] bg-accent px-1.5 py-0.2 text-[9.5px] font-bold text-white shadow-xs">
                                {clt.todayBtn || 'Hoy'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10.5px] text-muted font-mono mt-0.5">
                            <span>{monthName}</span>
                            <div className="flex items-center gap-1.5">
                              {dayEvents.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sunken border border-edge/60 text-muted/90">
                                  {dayEvents.length}
                                </span>
                              )}
                              {isAdmin && (
                                <button
                                  onClick={() => handleCellClick(dayIso, 10)}
                                  className="p-0.5 rounded text-muted hover:text-accent hover:bg-sunken cursor-pointer transition-colors"
                                  title="Añadir evento a este día"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Hours Timeline Track */}
                        <div
                          style={{ width: `${24 * HOUR_WIDTH}px`, minHeight: `${rowHeight}px` }}
                          className="relative shrink-0 select-none"
                        >
                          {/* Background Cells */}
                          <div className="absolute inset-0 grid grid-cols-[repeat(24,72px)] h-full">
                            {HOURS.map((h) => {
                              const isCurrentHourSlot = isToday && currentHour === h;
                              const isNight = h < 7 || h >= 22;
                              return (
                                <div
                                  key={h}
                                  onClick={() => handleCellClick(dayIso, h)}
                                  className={`border-r border-edge/30 h-full transition-colors cursor-pointer group/cell ${
                                    isCurrentHourSlot ? 'bg-accent/5' : isNight ? 'bg-black/15' : 'hover:bg-panel/40'
                                  }`}
                                  title={isAdmin ? `Click para añadir evento a las ${String(h).padStart(2, '0')}:00` : undefined}
                                >
                                  {isAdmin && (
                                    <div className="w-full h-full opacity-0 group-hover/cell:opacity-100 flex items-center justify-center pointer-events-none">
                                      <Plus className="w-3.5 h-3.5 text-accent/50" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Live Now Line for Today */}
                          {isToday && (
                            <div
                              style={{ left: `${nowPositionLeft}px` }}
                              className="absolute top-0 bottom-0 z-20 w-0.5 bg-rose-500 pointer-events-none"
                            >
                              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 -mt-1 shadow-xs animate-pulse ring-2 ring-rose-500/30" />
                            </div>
                          )}

                          {/* Rendered Event Cards */}
                          {placed.map((item) => renderEventCard(item.evt, item))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: SINGLE DAY VIEW */}
          {viewMode === 'day' && (
            <div className="max-w-3xl mx-auto p-4 space-y-3">
              {isSameDay(selectedDate, new Date()) && (
                <div className="flex items-center gap-2 px-1 py-1 my-2">
                  <span className="text-[11px] font-bold tabular-nums text-red-500 font-mono flex items-center gap-1.5 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span>{formatCurrentTimeString()} (Now)</span>
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-red-500 to-transparent" />
                </div>
              )}

              {filteredEvents.filter((e) => e.date === formatDateISO(selectedDate)).length === 0 ? (
                <div className="text-center py-16 text-muted">
                  <CalendarIcon className="w-10 h-10 mx-auto text-muted/40 mb-2" />
                  <p className="text-xs">{clt.noEventsDay}</p>
                </div>
              ) : (
                filteredEvents
                  .filter((e) => e.date === formatDateISO(selectedDate))
                  .map((evt) => (
                    <div
                      key={evt.id}
                      className="group flex items-start justify-between gap-3 p-3.5 rounded-[14px] bg-panel border border-edge shadow-v2-sm"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-ink">{evt.title}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border bg-accent/15 border-accent/30 text-accent">
                            {evt.category}
                          </span>
                        </div>
                        {evt.time && (
                          <div className="text-xs font-mono text-muted flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-accent" />
                            <span>{evt.time}</span>
                          </div>
                        )}
                        {evt.description && (
                          <p className="text-xs text-muted/90 pt-1 leading-relaxed">
                            {evt.description}
                          </p>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => onDeleteEvent(evt.id)}
                          className="opacity-60 group-hover:opacity-100 p-1.5 text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-[8px] transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
              )}
            </div>
          )}

          {/* VIEW 3: MONTH MATRIX VIEW */}
          {viewMode === 'month' && (
            <div className="max-w-5xl mx-auto p-4 space-y-3">
              <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-muted pb-1 border-b border-edge">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
              <div className="grid grid-cols-7 gap-1 auto-rows-fr">
                {Array.from({ length: 35 }).map((_, idx) => {
                  const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                  const startOffset = (firstDay.getDay() + 6) % 7;
                  const currentDayNum = idx - startOffset + 1;
                  const d = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), currentDayNum);
                  const isCurrentMonth = d.getMonth() === selectedDate.getMonth();
                  const isToday = isSameDay(d, new Date());
                  const dayEvts = filteredEvents.filter((e) => e.date === formatDateISO(d));

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDate(d);
                        setViewMode('day');
                      }}
                      className={`min-h-[75px] p-1.5 rounded-[10px] border transition-all cursor-pointer ${
                        isCurrentMonth ? 'bg-panel/70 border-edge/60' : 'bg-sunken/40 border-edge/30 opacity-40'
                      } ${isToday ? 'ring-1 ring-accent bg-accent/5' : 'hover:border-accent/40'}`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                        <span className={isToday ? 'font-bold text-accent' : 'text-muted'}>
                          {d.getDate()}
                        </span>
                        {dayEvts.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        )}
                      </div>

                      <div className="space-y-1">
                        {dayEvts.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="text-[10px] truncate rounded bg-sunken px-1 py-0.5 border border-edge/50 text-ink/80"
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvts.length > 2 && (
                          <span className="text-[9px] text-accent font-mono pl-1">
                            +{dayEvts.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. New Event Creation Modal (Admin Only) */}
      {isAdmin && showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-[18px] bg-panel border border-edge shadow-v2-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-edge/60 pb-3">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-accent" />
                <span>{clt.newEvent}</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-muted hover:text-ink p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted mb-1 font-medium">Event Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Nginx SSL Audit or Sprint Planning"
                  className="w-full bg-sunken border border-edge rounded-[10px] px-3 py-2 text-ink placeholder-muted/60 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Event Type: Standard | Work Block Shift | Absence */}
              <div>
                <label className="block text-muted mb-1 font-medium">Visual Style</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'standard', label: 'Milestone / Task' },
                    { id: 'shift', label: 'Work Block (Amber)' },
                    { id: 'absence', label: 'Absence (Emerald)' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewEventType(t.id)}
                      className={`py-1.5 px-2 rounded-[8px] text-[11px] font-medium border transition-colors cursor-pointer text-center truncate ${
                        newEventType === t.id
                          ? 'bg-accent/15 border-accent text-accent font-semibold'
                          : 'bg-sunken border-edge text-muted hover:text-ink'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted mb-1 font-medium">Layer</label>
                  <select
                    value={newLayer}
                    onChange={(e) => setNewLayer(e.target.value)}
                    className="w-full bg-sunken border border-edge rounded-[10px] px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  >
                    {layersList.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-muted mb-1 font-medium">Team / Project</label>
                  <select
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value)}
                    className="w-full bg-sunken border border-edge rounded-[10px] px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  >
                    {groupsList.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted mb-1 font-medium">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-sunken border border-edge rounded-[10px] px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  >
                    <option value="Servidor">Servidor / VPS</option>
                    <option value="Cita">Cita Consular</option>
                    <option value="Proyecto">Proyecto / Sprint</option>
                    <option value="Personal">Personal / Privado</option>
                    <option value="custom">+ Custom Category...</option>
                  </select>
                </div>

                {newCategory === 'custom' ? (
                  <div>
                    <label className="block text-muted mb-1 font-medium">Custom Category Name</label>
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. AI Research"
                      className="w-full bg-sunken border border-edge rounded-[10px] px-3 py-2 text-ink focus:outline-none focus:border-accent"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-muted mb-1 font-medium">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full bg-sunken border border-edge rounded-[10px] px-3 py-2 text-ink focus:outline-none focus:border-accent"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-muted mb-1 font-medium">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-sunken border border-edge rounded-[10px] px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-muted mb-1 font-medium">Time / Schedule</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-sunken border border-edge rounded-[10px] px-3 py-2 text-ink focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted mb-1 font-medium">Notes / Details</label>
                <textarea
                  rows="2"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Additional context or links..."
                  className="w-full bg-sunken border border-edge rounded-[10px] px-3 py-2 text-ink placeholder-muted/60 focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1 text-muted hover:text-ink">
                <input
                  type="checkbox"
                  checked={newIsPrivate}
                  onChange={(e) => setNewIsPrivate(e.target.checked)}
                  className="rounded accent-rose-500 cursor-pointer"
                />
                <span className="flex items-center gap-1 text-[11.5px]">
                  <Lock className="w-3 h-3 text-rose-400" /> Private event (obscured for guests)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge/60">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-[10px] bg-sunken text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-[10px] bg-accent text-white font-medium hover:bg-accent/90 transition-all shadow-v2-sm cursor-pointer"
                >
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Add Custom Layer or Team/Project Modal */}
      {isAdmin && showAddLayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-[18px] bg-panel border border-edge shadow-v2-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-edge/60 pb-3">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Tag className="w-4 h-4 text-accent" />
                <span>{layerOrTeamType === 'layer' ? 'Add Custom Layer' : 'Add Team / Project'}</span>
              </h2>
              <button
                onClick={() => setShowAddLayerModal(false)}
                className="text-muted hover:text-ink p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-muted mb-1 font-medium">
                  {layerOrTeamType === 'layer' ? 'Layer Name' : 'Team / Project Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomName}
                  onChange={(e) => setNewCustomName(e.target.value)}
                  placeholder={layerOrTeamType === 'layer' ? 'e.g. AI Research' : 'e.g. DarkBot Core'}
                  className="w-full bg-sunken border border-edge rounded-[10px] px-3 py-2 text-ink placeholder-muted/60 focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge/60">
                <button
                  type="button"
                  onClick={() => setShowAddLayerModal(false)}
                  className="px-3 py-1.5 rounded-[10px] bg-sunken text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-[10px] bg-accent text-white font-medium hover:bg-accent/90 transition-all shadow-v2-sm cursor-pointer"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. iCal Subscription Feed Modal */}
      {showIcsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-[18px] bg-panel border border-edge shadow-v2-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-edge/60 pb-3">
              <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Radio className="w-4 h-4 text-accent" />
                <span>iCalendar (.ics) Live Subscription</span>
              </h2>
              <button
                onClick={() => setShowIcsModal(false)}
                className="text-muted hover:text-ink p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Subscribe directly from Apple Calendar, Google Calendar, or Outlook to keep Rodrigo's schedule synchronized automatically.
            </p>

            <div className="p-2.5 rounded-[10px] bg-sunken border border-edge font-mono text-xs flex items-center justify-between gap-2 text-slate-200">
              <span className="truncate">{feedUrl}</span>
              <button
                onClick={handleCopyIcsUrl}
                className="p-1.5 rounded-md text-accent hover:bg-panel transition-colors cursor-pointer shrink-0"
                title="Copy URL"
              >
                {copiedIcs ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-edge/60">
              <a
                href={feedUrl}
                download="ask-rodrigo-calendar.ics"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-sunken text-ink text-xs font-medium hover:bg-edge transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .ics</span>
              </a>
              <button
                onClick={() => setShowIcsModal(false)}
                className="px-4 py-1.5 rounded-[10px] bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
