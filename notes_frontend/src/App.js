import React, { useEffect, useState, useCallback } from "react";
import "./App.css";

// API base path (update this if your backend runs elsewhere)
const API_BASE_URL = "/api/notes";

/**
 * PUBLIC_INTERFACE
 * NoteItem Component displays individual note title and handles selection
 */
function NoteItem({ note, active, onClick, onDelete }) {
  return (
    <div className={`note-item ${active ? "active" : ""}`} onClick={onClick}>
      <div className="note-title">{note.title || <span className="untitled">(Untitled Note)</span>}</div>
      <button className="delete-btn" title="Delete" onClick={e => { e.stopPropagation(); onDelete(note.id); }}>
        🗑️
      </button>
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Sidebar lists notes and enables note creation and navigation
 */
function Sidebar({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  collapsed,
  setCollapsed,
}) {
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">🗒️ Notes</span>
        <button className="sidebar-toggle" onClick={() => setCollapsed((prev) => !prev)}>
          {collapsed ? "›" : "‹"}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="sidebar-list">
            {notes.length === 0 && (
              <div className="empty-hint">No notes</div>
            )}
            {notes.map((note) => (
              <NoteItem
                note={note}
                key={note.id}
                active={selectedNoteId === note.id}
                onClick={() => onSelectNote(note.id)}
                onDelete={onDeleteNote}
              />
            ))}
          </div>
          <button className="new-note-btn" onClick={onCreateNote}>
            ＋ New Note
          </button>
        </>
      )}
    </aside>
  );
}

/**
 * PUBLIC_INTERFACE
 * TopBar contains the search box and app branding
 */
function TopBar({ searchQuery, setSearchQuery, onNewNote }) {
  return (
    <header className="topbar">
      <span className="brand">📝 Note Organizer</span>
      <input
        type="text"
        className="search-input"
        placeholder="Search notes..."
        aria-label="Search notes"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <button className="topbar-btn" title="Create note" onClick={onNewNote}>
        ＋ Note
      </button>
    </header>
  );
}

/**
 * PUBLIC_INTERFACE
 * NoteEditor handles viewing and editing the currently selected note
 */
function NoteEditor({ note, onChange, onSave, onCancel, isEditing, loading }) {
  const [editNote, setEditNote] = useState(note || {});
  useEffect(() => {
    setEditNote(note || {});
  }, [note]);

  // PUBLIC_INTERFACE
  function handleFieldChange(e) {
    setEditNote({ ...editNote, [e.target.name]: e.target.value });
    if (onChange) onChange({ ...editNote, [e.target.name]: e.target.value });
  }

  if (!note) {
    return (
      <div className="note-editor empty">
        <div>Select a note, or create one to get started.</div>
      </div>
    );
  }

  return (
    <div className="note-editor">
      {isEditing ? (
        <>
          <input
            type="text"
            value={editNote.title || ""}
            name="title"
            className="note-title-input"
            placeholder="Title"
            onChange={handleFieldChange}
            disabled={loading}
            autoFocus
          />
          <textarea
            name="content"
            className="note-content-input"
            placeholder="Write your note here..."
            value={editNote.content || ""}
            onChange={handleFieldChange}
            disabled={loading}
          />
          <div className="editor-actions">
            <button className="editor-btn primary" onClick={() => onSave(editNote)} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
            <button className="editor-btn secondary" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="note-title-view">{note.title ? note.title : <span className="untitled">(Untitled)</span>}</div>
          <div className="note-content-view">
            {note.content || <span className="untitled">(No content)</span>}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Main App component encapsulating note management logic and layout
 */
function App() {
  // Notes state and UI state
  const [notes, setNotes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [theme, setTheme] = useState("light");
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch notes on load or after CRUD
  const fetchNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const response = await fetch(API_BASE_URL);
      if (!response.ok) throw new Error("Error fetching notes");
      const data = await response.json();
      setNotes(data);
      setLoadingNotes(false);
      // Restore selected note if possible
      if (selectedId) {
        const found = data.find(n => n.id === selectedId);
        setActiveNote(found || null);
      }
    } catch (err) {
      setErrorMsg("Failed to load notes.");
      setLoadingNotes(false);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchNotes();
    // eslint-disable-next-line
  }, []);

  // Restore note selection when notes update
  useEffect(() => {
    if (selectedId) {
      setActiveNote(notes.find(n => n.id === selectedId) || null);
    } else {
      setActiveNote(null);
    }
  }, [notes, selectedId]);

  // Handle theme toggle
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Filter notes by search query
  const filteredNotes = notes.filter(
    (n) =>
      (n.title && n.title.toLowerCase().includes(search.toLowerCase())) ||
      (n.content && n.content.toLowerCase().includes(search.toLowerCase()))
  );

  // Select note for viewing or editing
  function handleSelectNote(id) {
    setSelectedId(id);
    setEditing(false);
  }

  // Start editing selected note
  function handleEditNote() {
    setEditing(true);
  }

  // Cancel editing
  function handleCancelEdit() {
    setEditing(false);
  }

  // PUBLIC_INTERFACE
  // Add new note via API
  async function handleCreateNote() {
    setLoadingSave(true);
    setErrorMsg("");
    try {
      const response = await fetch(API_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", content: "" }),
      });
      if (!response.ok) throw new Error("Failed to create note");
      const newNote = await response.json();
      setNotes((prev) => [...prev, newNote]);
      setSelectedId(newNote.id);
      setEditing(true);
      setLoadingSave(false);
    } catch (err) {
      setLoadingSave(false);
      setErrorMsg("Failed to create note.");
    }
  }

  // PUBLIC_INTERFACE
  // Save updated note via API
  async function handleSaveNote(note) {
    setLoadingSave(true);
    setErrorMsg("");
    try {
      const response = await fetch(`${API_BASE_URL}/${note.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
      if (!response.ok) throw new Error("Failed to save note");
      const updatedNote = await response.json();
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updatedNote : n)));
      setActiveNote(updatedNote);
      setEditing(false);
      setLoadingSave(false);
    } catch {
      setLoadingSave(false);
      setErrorMsg("Failed to save note.");
    }
  }

  // PUBLIC_INTERFACE
  // Delete note via API
  async function handleDeleteNote(id) {
    if (!window.confirm("Delete this note?")) return;
    setErrorMsg("");
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete note");
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedId === id) {
        setSelectedId(null);
        setActiveNote(null);
        setEditing(false);
      }
    } catch {
      setErrorMsg("Failed to delete note.");
    }
  }

  // Keyboard shortcut for new note
  useEffect(() => {
    function handleKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleCreateNote();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
    // eslint-disable-next-line
  }, []);

  // Layout render
  return (
    <div className={`main-app theme-${theme}`}>
      <Sidebar
        notes={filteredNotes}
        selectedNoteId={selectedId}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />
      <div className="layout">
        <TopBar searchQuery={search} setSearchQuery={setSearch} onNewNote={handleCreateNote} />
        <main className="main-panel">
          {errorMsg && <div className="error-msg">{errorMsg}</div>}
          {loadingNotes ? (
            <div className="loading">Loading notes...</div>
          ) : activeNote ? (
            <>
              <NoteEditor
                note={activeNote}
                isEditing={editing}
                onSave={handleSaveNote}
                onCancel={handleCancelEdit}
                loading={loadingSave}
              />
              {!editing && (
                <button className="edit-btn" onClick={handleEditNote}>
                  ✏️ Edit
                </button>
              )}
            </>
          ) : (
            <div className="blank-panel">
              <p>Select or create a note to get started.</p>
            </div>
          )}
        </main>
        <button
          className="theme-toggle"
          onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>
    </div>
  );
}

export default App;
