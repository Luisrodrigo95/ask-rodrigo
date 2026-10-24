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
