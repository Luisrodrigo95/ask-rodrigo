import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data/calendarEvents.json');

function ensureFile() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialEvents = [
      {
        id: 'evt_1',
        title: 'Mantenimiento Preventivo VPS',
        category: 'Servidor',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '03:00',
        description: 'Revisión de logs Nginx, rotación y purga de temporales en Debian 13.',
        priority: 'high'
      },
      {
        id: 'evt_2',
        title: 'Revisión Citas TotiMigraciones',
        category: 'Cita',
        date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        time: '11:00',
        description: 'Auditoría de confirmaciones de citas consulares recibidas por IMAP.',
        priority: 'medium'
      }
    ];
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialEvents, null, 2), 'utf-8');
  }
}

export function getCalendarEvents() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addCalendarEvent(eventData) {
  ensureFile();
  const events = getCalendarEvents();
  const newEvent = {
    id: 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
    title: String(eventData.title || 'Nuevo Evento').trim(),
    category: eventData.category || 'General',
    date: eventData.date || new Date().toISOString().split('T')[0],
    time: eventData.time || '10:00',
    description: eventData.description || '',
    priority: eventData.priority || 'medium',
    createdAt: new Date().toISOString()
  };

  events.push(newEvent);
  fs.writeFileSync(DATA_FILE, JSON.stringify(events, null, 2), 'utf-8');
  return newEvent;
}

export function deleteCalendarEvent(id) {
  ensureFile();
  const events = getCalendarEvents();
  const filtered = events.filter((e) => e.id !== id);
  fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return filtered.length !== events.length;
}

/**
 * Generates an RFC 5545 compliant iCalendar (.ics) feed
 * Compatible with Google Calendar, Apple Calendar, Outlook, and webcal:// subscriptions.
 */
export function generateICalFeed() {
  ensureFile();
  const events = getCalendarEvents();
  const now = new Date();
  const nowIso = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//therodrigo.com//Ask Rodrigo Calendar 1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Calendario de Rodrigo García',
    'X-WR-TIMEZONE:Europe/Madrid',
    'X-WR-CALDESC:Agenda de Rodrigo García: Mantenimientos VPS, Citas Consulares y Sprints de Desarrollo.'
  ];

  events.forEach((evt) => {
    const rawDate = evt.date ? evt.date.replace(/-/g, '') : '20261024';
    const rawTime = evt.time ? evt.time.replace(/:/g, '') + '00' : '100000';
    const dtstart = `${rawDate}T${rawTime}`;
    
    // Default duration: 1 hour
    const hour = parseInt(evt.time ? evt.time.split(':')[0] : '10', 10);
    const minute = evt.time && evt.time.split(':')[1] ? evt.time.split(':')[1] : '00';
    const endHour = String(Math.min(23, hour + 1)).padStart(2, '0');
    const dtend = `${rawDate}T${endHour}${minute}00`;

    const summary = (evt.title || 'Evento').replace(/[\r\n]+/g, ' ');
    const desc = (evt.description || '').replace(/[\r\n]+/g, '\\n');
    const category = (evt.category || 'General').toUpperCase();

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${evt.id || Date.now()}@therodrigo.com`);
    lines.push(`DTSTAMP:${nowIso}`);
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    lines.push(`SUMMARY:${summary}`);
    if (desc) lines.push(`DESCRIPTION:${desc}`);
    lines.push(`CATEGORIES:${category}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

