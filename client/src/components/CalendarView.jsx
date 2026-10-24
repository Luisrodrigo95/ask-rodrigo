import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Clock, 
  Tag, 
  AlertCircle, 
  CheckCircle2,
  CalendarCheck,
  Lock
} from 'lucide-react';

export function CalendarView({
  events = [],
  onCreateEvent,
  onDeleteEvent,
  loading,
  currentUser,
  t
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Appointment');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');

  const isAdmin = currentUser?.role === 'admin';
  const clt = t ? t.calendar : {
    title: "Rodrigo's Calendar & Schedule",
    subtitle: 'Consular appointments, scheduled VPS maintenance, and milestones.',
    newEvent: 'New Event',
    closeForm: 'Close Form',
    guestNotice: 'Read-Only Mode (Guest)',
    eventTitle: 'Event Title *',
    titlePlaceholder: 'e.g. Nginx Audit or Consular Appointment',
    category: 'Category',
    catAppointment: 'Consular / Immigration Appointment',
    catServer: 'VPS / Server Maintenance',
    catWork: 'Work / ZAP-Hosting / Projects',
    catPersonal: 'Personal',
    date: 'Date',
    time: 'Time',
    notes: 'Notes / Details',
    notesPlaceholder: 'Details regarding the event...',
    cancel: 'Cancel',
    save: 'Save Event',
    emptyTitle: 'No events scheduled',
    emptyDescAdmin: 'Create a new event using the button above.',
    emptyDescGuest: "Rodrigo's schedule is currently clear."
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !isAdmin) return;
    onCreateEvent({
      title: title.trim(),
      category,
      date,
      time,
      description: description.trim(),
      priority
    });
    setTitle('');
    setDescription('');
    setShowForm(false);
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'Cita':
      case 'Appointment':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Servidor':
      case 'Server':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'Trabajo':
      case 'Work':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-teal-400" />
            <span>{clt.title}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {clt.subtitle}
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium shadow-md shadow-teal-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{showForm ? clt.closeForm : clt.newEvent}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 text-xs">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>{clt.guestNotice}</span>
          </div>
        )}
      </div>

      {/* New Event Form (collapsible - Admin only) */}
      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-900 border border-teal-500/40 space-y-4 shadow-lg animate-fadeIn">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300 font-mono">
            {clt.newEvent}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">{clt.eventTitle}</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={clt.titlePlaceholder}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{clt.category}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Appointment">{clt.catAppointment}</option>
                <option value="Server">{clt.catServer}</option>
                <option value="Work">{clt.catWork}</option>
                <option value="Personal">{clt.catPersonal}</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{clt.date}</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">{clt.time}</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs mb-1">{clt.notes}</label>
            <textarea
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={clt.notesPlaceholder}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
            >
              {clt.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md shadow-teal-500/20"
            >
              {clt.save}
            </button>
          </div>
        </form>
      )}

      {/* Events List */}
      <div className="space-y-3">
        {events.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <CalendarIcon className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="font-medium text-slate-400">{clt.emptyTitle}</p>
            <p className="text-[11px] mt-1 text-slate-500">
              {isAdmin ? clt.emptyDescAdmin : clt.emptyDescGuest}
            </p>
          </div>
        ) : (
          events
            .sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`))
            .map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700/80 transition-all flex items-start justify-between gap-3 shadow-sm group"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-white">{event.title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-medium ${getCategoryBadge(event.category)}`}>
                      {event.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1 text-teal-400">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{event.date}</span>
                    </span>
                    {event.time && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{event.time}</span>
                      </span>
                    )}
                  </div>

                  {event.description && (
                    <p className="text-xs text-slate-400 mt-1">{event.description}</p>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete event "${event.title}"?`)) {
                        onDeleteEvent(event.id);
                      }
                    }}
                    title="Delete event"
                    className="opacity-60 group-hover:opacity-100 p-2 rounded-xl text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
