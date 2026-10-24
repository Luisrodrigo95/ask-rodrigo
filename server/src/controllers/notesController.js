import { getNotes, saveNote, deleteNote } from '../services/notesService.js';

export function getNotesHandler(req, res) {
  try {
    const notes = getNotes();
    return res.json({ notes });
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener notas', details: err.message });
  }
}

export function saveNoteHandler(req, res) {
  try {
    const { id, title, category, content } = req.body;
    if (!title && !content) {
      return res.status(400).json({ error: 'El título o contenido es requerido.' });
    }
    const saved = saveNote({ id, title, category, content });
    return res.json({ ok: true, note: saved });
  } catch (err) {
    return res.status(500).json({ error: 'Error al guardar nota', details: err.message });
  }
}

export function deleteNoteHandler(req, res) {
  try {
    const { id } = req.params;
    const ok = deleteNote(id);
    return res.json({ ok });
  } catch (err) {
    return res.status(500).json({ error: 'Error al eliminar nota', details: err.message });
  }
}
