import React, { useState, useEffect, useMemo } from 'react';
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
        <main className="min-w-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
          {/* VIEW 1: WEEK AGENDA TIMELINE (Ask Marvin Core) */}
          {viewMode === 'week' && (
            <div className="divide-y divide-edge max-w-5xl mx-auto w-full">
              {weekDays.map((dayDate) => {
                const dayIso = formatDateISO(dayDate);
                const isToday = isSameDay(dayDate, new Date());
                const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
                const monthName = dayDate.toLocaleDateString('en-US', { month: 'long' });
                const dayNum = dayDate.getDate();

                // Get events matching this date
                const dayEvents = filteredEvents
                  .filter((e) => e.date === dayIso)
                  .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

                return (
                  <section key={dayIso} className="px-4 py-3 hover:bg-panel/20 transition-colors">
                    {/* Day Header */}
                    <div className="flex items-center justify-between mb-2">
                      <h3
                        className={`flex items-center gap-2 text-xs font-semibold ${
                          isToday ? 'text-accent font-bold' : 'text-muted'
                        }`}
                      >
                        {isToday && (
                          <span className="rounded-[6px] bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                            {clt.todayBtn}
                          </span>
                        )}
                        <span>
                          {dayName} {dayNum} {monthName}
                        </span>
                      </h3>

                      <span className="text-[11px] font-mono text-muted/60">
                        {dayEvents.length > 0 ? `${dayEvents.length} events` : ''}
                      </span>
                    </div>

                    {/* Ask Marvin Live "Now" Line Indicator for Today */}
                    {isToday && (
                      <div className="flex items-center gap-2 px-1 py-1 my-2 animate-fadeIn">
                        <span className="text-[10px] font-bold tabular-nums text-red-500 font-mono flex items-center gap-1.5 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                          <span>{formatCurrentTimeString()}</span>
                        </span>
                        <span className="h-px flex-1 bg-gradient-to-r from-red-500 via-red-500/80 to-transparent" />
                      </div>
                    )}

                    {/* Event Cards Renderers */}
                    {dayEvents.length > 0 ? (
                      <div className="space-y-1.5">
                        {dayEvents.map((evt) => {
                          // 1. Check if Private and non-admin: Render Ask Marvin's obfuscated grayscale bar
                          if (evt.isPrivate && !isAdmin) {
                            return (
                              <div
                                key={evt.id}
                                className="flex items-center gap-2.5 rounded-[10px] border border-edge px-3 py-2 text-left bg-panel/40 opacity-50 grayscale select-none"
                              >
                                <span className="h-7 w-1 shrink-0 rounded-full bg-red-500" />
                                <span className="text-xs font-mono text-muted tabular-nums shrink-0">
                                  {evt.time || 'All day'}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-medium text-ink">
                                    Private Event
                                  </span>
                                  <span className="block truncate text-[10px] text-muted">
                                    Private calendar of Rodrigo García
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          // 2. Work Block / Shift Chip (Yellow/Amber Pill)
                          if (evt.eventType === 'shift') {
                            return (
                              <div
                                key={evt.id}
                                className="group flex items-center justify-between gap-3 px-3 py-2 rounded-[10px] bg-amber-500/15 border border-amber-500/30 text-xs shadow-v2-sm"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono font-semibold text-amber-300 shrink-0">
                                    {evt.time || '10:00–18:00'}
                                  </span>
                                  <span className="text-amber-200 font-medium truncate">
                                    · {evt.title}
                                  </span>
                                  {evt.description && (
                                    <span className="text-amber-300/80 text-[11px] truncate hidden sm:inline">
                                      ({evt.description})
                                    </span>
                                  )}
                                </div>
                                {isAdmin && (
                                  <button
                                    onClick={() => onDeleteEvent(evt.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-amber-400 hover:text-rose-400 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          }

                          // 3. Absence / Leave Chip (Emerald Pill)
                          if (evt.eventType === 'absence') {
                            return (
                              <div
                                key={evt.id}
                                className="group flex items-center justify-between gap-3 px-3 py-1.5 rounded-[10px] bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 shadow-v2-sm"
                              >
                                <span className="truncate font-medium">
                                  {evt.title} · Leave & Absence
                                </span>
                                {isAdmin && (
                                  <button
                                    onClick={() => onDeleteEvent(evt.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-emerald-400 hover:text-rose-400 cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          }

                          // 4. Standard Milestone / Sprint Card
                          return (
                            <div
                              key={evt.id}
                              className="group flex items-center justify-between gap-3 p-2.5 rounded-[12px] bg-panel border border-edge hover:border-accent/40 transition-all shadow-v2-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {evt.time && (
                                  <div className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-300 bg-sunken px-2 py-1 rounded-[8px] border border-edge/60 shrink-0">
                                    <Clock className="w-3 h-3 text-muted" />
                                    <span>{evt.time}</span>
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-[13px] text-ink truncate">
                                      {evt.title}
                                    </span>
                                    <span className="px-2 py-0.2 rounded-full text-[10px] font-medium border font-mono bg-accent/15 border-accent/30 text-accent">
                                      {evt.category}
                                    </span>
                                    {evt.isPrivate && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 font-mono flex items-center gap-0.5">
                                        <Lock className="w-2.5 h-2.5" /> Private
                                      </span>
                                    )}
                                  </div>
                                  {evt.description && (
                                    <p className="text-[11px] text-muted truncate mt-0.5">
                                      {evt.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {isAdmin && (
                                <button
                                  onClick={() => onDeleteEvent(evt.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-rose-400 hover:bg-rose-500/10 rounded-[8px] transition-all cursor-pointer"
                                  title="Delete event"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      !isToday && (
                        <p className="text-[11px] text-muted/50 italic px-1 py-0.5">
                          {clt.noEventsDay}
                        </p>
                      )
                    )}
                  </section>
                );
              })}
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
