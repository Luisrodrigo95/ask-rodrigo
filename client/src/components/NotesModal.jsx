import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  Send,
  Search,
  StickyNote,
  Tag,
  Code2,
  Sparkles,
  Terminal,
  Lightbulb,
  FileText
} from 'lucide-react';
import { fetchNotes, saveAdminNote, deleteAdminNote } from '../services/api.js';

const CATEGORY_ICONS = {
  Prompt: Sparkles,
  Snippet: Code2,
  Command: Terminal,
  Idea: Lightbulb,
  Config: FileText
};

export function NotesModal({
  isOpen,
  onClose,
  onInsertPrompt,
  t
}) {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingNote, setEditingNote] = useState(null); // null when not editing/creating
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Prompt');
  const [formContent, setFormContent] = useState('');

  const nt = t?.notesModal || {
    title: "Admin Scratchpad & Prompts",
    subtitle: "Save and quickly insert prompts, code snippets, and operational notes for AGy.",
    newNote: "New Note",
    searchPlaceholder: "Search notes and prompts...",
    allCategories: "All categories",
    catPrompt: "AI Prompt",
    catSnippet: "Code Snippet",
    catCommand: "Bash Command",
    catIdea: "Idea / Task",
    catConfig: "Config / Setting",
    emptyTitle: "No notes saved yet",
    emptyDesc: "Create your first saved prompt or snippet using the button above.",
    titleLabel: "Title",
    titlePlaceholder: "Note title (e.g. Subagent Prompt, Audit Script)",
    categoryLabel: "Category",
    contentLabel: "Content / Body",
    contentPlaceholder: "Write your prompt, command, or note content here...",
    save: "Save Note",
    cancel: "Cancel",
    useAsPrompt: "Use in Chat",
    copied: "Copied!",
    copy: "Copy",
    deleteConfirm: "Are you sure you want to delete this note?",
    edit: "Edit Note",
    close: "Close Scratchpad"
  };

  useEffect(() => {
    if (isOpen) {
      loadNotes();
    }
  }, [isOpen]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await fetchNotes();
      if (data && data.notes) {
        setNotes(data.notes);
        localStorage.setItem('ask_rodrigo_cached_notes', JSON.stringify(data.notes));
      }
    } catch (err) {
      console.warn('Failed to fetch notes from backend, using local cache:', err);
      try {
        const cached = localStorage.getItem('ask_rodrigo_cached_notes');
        if (cached) setNotes(JSON.parse(cached));
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingNote({ id: null });
    setFormTitle('');
    setFormCategory('Prompt');
    setFormContent('');
  };

  const handleOpenEdit = (note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormCategory(note.category || 'Prompt');
    setFormContent(note.content || '');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formTitle.trim() && !formContent.trim()) return;

    const payload = {
      id: editingNote?.id || null,
      title: formTitle.trim() || 'Untitled Note',
      category: formCategory,
      content: formContent.trim()
    };

    try {
      const res = await saveAdminNote(payload);
      if (res && res.note) {
        setNotes((prev) => {
          const idx = prev.findIndex((n) => n.id === res.note.id);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = res.note;
            return next;
          }
          return [res.note, ...prev];
        });
      }
      setEditingNote(null);
    } catch (err) {
      console.error('Failed to save note:', err);
      // Local fallback
      const localNote = {
        id: payload.id || 'note_' + Date.now().toString(36),
        ...payload,
        updatedAt: new Date().toISOString()
      };
      setNotes((prev) => [localNote, ...prev.filter((n) => n.id !== localNote.id)]);
      setEditingNote(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(nt.deleteConfirm)) return;
    try {
      await deleteAdminNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (editingNote?.id === id) setEditingNote(null);
    } catch (err) {
      console.error('Failed to delete note:', err);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleUsePrompt = (text) => {
    if (onInsertPrompt) {
      onInsertPrompt(text);
    }
    onClose();
  };

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchCat = selectedCategory === 'all' || (n.category || 'Prompt').toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [notes, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl max-h-[90vh] bg-paper border border-edge rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleUp text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-edge flex items-center justify-between bg-panel/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
              <StickyNote className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink leading-tight flex items-center gap-1.5">
                {nt.title}
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                  Admin
                </span>
              </h2>
              <p className="text-[11px] text-muted">{nt.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 rounded-[10px] bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 transition-all shadow-v2-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{nt.newNote}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-sunken text-muted hover:text-ink transition-colors cursor-pointer"
              title={nt.close}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Toolbar */}
        <div className="p-3 border-b border-edge/60 bg-panel/30 flex flex-wrap items-center justify-between gap-2">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={nt.searchPlaceholder}
              className="w-full pl-8 pr-7 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-ink placeholder:text-muted/60 focus:outline-none focus:border-accent"
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

          {/* Category Chips */}
          <div className="flex items-center gap-1 text-[11px] font-medium overflow-x-auto [scrollbar-width:none]">
            {[
              { id: 'all', label: nt.allCategories },
              { id: 'Prompt', label: nt.catPrompt },
              { id: 'Snippet', label: nt.catSnippet },
              { id: 'Command', label: nt.catCommand },
              { id: 'Idea', label: nt.catIdea }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-[8px] transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-accent/15 border border-accent/40 text-accent font-semibold shadow-v2-sm'
                    : 'bg-sunken border border-edge/60 text-muted hover:text-ink'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area: Form or Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 [scrollbar-width:thin]">
          {/* Create / Edit Form Overlay */}
          {editingNote && (
            <form onSubmit={handleSave} className="p-4 rounded-xl bg-panel border border-accent/40 shadow-v2-md space-y-3 mb-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-edge">
                <span className="text-xs font-bold text-accent flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" />
                  {editingNote.id ? nt.edit : nt.newNote}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="text-muted hover:text-ink text-xs cursor-pointer"
                >
                  {nt.cancel}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-semibold text-muted">{nt.titleLabel}</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={nt.titlePlaceholder}
                    className="w-full px-3 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-ink focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted">{nt.categoryLabel}</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-ink focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="Prompt">Prompt</option>
                    <option value="Snippet">Snippet</option>
                    <option value="Command">Command</option>
                    <option value="Idea">Idea</option>
                    <option value="Config">Config</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted">{nt.contentLabel}</label>
                <textarea
                  rows={6}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder={nt.contentPlaceholder}
                  className="w-full p-3 rounded-[8px] bg-sunken border border-edge text-xs text-ink font-mono focus:outline-none focus:border-accent [scrollbar-width:thin]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-3 py-1.5 rounded-[8px] bg-sunken border border-edge text-xs text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  {nt.cancel}
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-[8px] bg-accent text-white font-semibold text-xs hover:bg-accent/90 transition-colors shadow-v2-sm cursor-pointer"
                >
                  {nt.save}
                </button>
              </div>
            </form>
          )}

          {/* Notes List */}
          {filteredNotes.length === 0 ? (
            <div className="py-12 text-center text-muted space-y-2">
              <StickyNote className="w-9 h-9 mx-auto opacity-30 text-accent" />
              <p className="text-sm font-semibold text-ink">{nt.emptyTitle}</p>
              <p className="text-xs text-muted max-w-sm mx-auto">{nt.emptyDesc}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredNotes.map((note) => {
                const IconComponent = CATEGORY_ICONS[note.category] || StickyNote;
                return (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-xl bg-panel border border-edge hover:border-accent/40 transition-all shadow-v2-sm flex flex-col justify-between group space-y-2"
                  >
                    <div>
                      {/* Top Meta */}
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-edge/50">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent flex items-center gap-1">
                          <IconComponent className="w-3 h-3" />
                          <span>{note.category || 'Prompt'}</span>
                        </span>
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(note)}
                            className="p-1 rounded-[6px] text-muted hover:text-ink hover:bg-sunken cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(note.id)}
                            className="p-1 rounded-[6px] text-muted hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Content */}
                      <h3 className="text-xs font-bold text-ink pt-1 line-clamp-1">{note.title}</h3>
                      <pre className="mt-1.5 p-2 rounded-[8px] bg-sunken border border-edge/60 text-[11px] font-mono text-ink/80 whitespace-pre-wrap break-words max-h-32 overflow-y-auto [scrollbar-width:thin]">
                        {note.content}
                      </pre>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <button
                        onClick={() => handleCopy(note.id, note.content)}
                        className="inline-flex items-center gap-1 text-muted hover:text-ink cursor-pointer"
                      >
                        {copiedId === note.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">{nt.copied}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{nt.copy}</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleUsePrompt(note.content)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] bg-accent/15 border border-accent/30 text-accent font-semibold hover:bg-accent hover:text-white transition-all cursor-pointer shadow-v2-sm"
                        title="Insert directly into chat prompt"
                      >
                        <Send className="w-3 h-3" />
                        <span>{nt.useAsPrompt}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
