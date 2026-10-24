import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NOTES_FILE = path.resolve(__dirname, '../data/notes.json');

function ensureNotesFile() {
  if (!fs.existsSync(NOTES_FILE)) {
    fs.mkdirSync(path.dirname(NOTES_FILE), { recursive: true });
    fs.writeFileSync(NOTES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getNotes() {
  ensureNotesFile();
  try {
    const raw = fs.readFileSync(NOTES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[NotesService Error reading notes.json]:', err);
    return [];
  }
}

export function saveNote(noteData) {
  ensureNotesFile();
  const notes = getNotes();
  const now = new Date().toISOString();

  if (noteData.id) {
    const idx = notes.findIndex((n) => n.id === noteData.id);
    if (idx !== -1) {
      notes[idx] = {
        ...notes[idx],
        title: String(noteData.title || notes[idx].title).trim(),
        category: noteData.category || notes[idx].category || 'Prompt',
        content: String(noteData.content || '').trim(),
        updatedAt: now
      };
      fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
      return notes[idx];
    }
  }

  // Create new note
  const newNote = {
    id: 'note_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
    title: String(noteData.title || 'Nueva Nota').trim(),
    category: noteData.category || 'Prompt',
    content: String(noteData.content || '').trim(),
    createdAt: now,
    updatedAt: now
  };

  notes.unshift(newNote);
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8');
  return newNote;
}

export function deleteNote(id) {
  ensureNotesFile();
  const notes = getNotes();
  const filtered = notes.filter((n) => n.id !== id);
  if (filtered.length !== notes.length) {
    fs.writeFileSync(NOTES_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  }
  return false;
}
