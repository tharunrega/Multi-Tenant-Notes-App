import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notesApi, tenantApi, Note } from '../api/client';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      const data = await notesApi.getAll();
      setNotes(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    try {
      setIsCreating(true);
      const newNote = await notesApi.create(newNoteTitle, newNoteContent);
      setNotes([newNote, ...notes]);
      setNewNoteTitle('');
      setNewNoteContent('');
      setShowCreateForm(false);
    } catch (err: any) {
      if (err.response?.data?.limitReached) {
        setError('Free plan limit reached. Upgrade to Pro to create more notes.');
      } else {
        setError(err.response?.data?.error || 'Failed to create note');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote || !editTitle.trim() || !editContent.trim()) return;

    try {
      const updatedNote = await notesApi.update(editingNote.id, editTitle, editContent);
      setNotes(notes.map(note => note.id === editingNote.id ? updatedNote : note));
      setEditingNote(null);
      setEditTitle('');
      setEditContent('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await notesApi.delete(noteId);
      setNotes(notes.filter(note => note.id !== noteId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete note');
    }
  };

  const handleUpgrade = async () => {
    if (!user) return;

    try {
      await tenantApi.upgrade(user.tenantSlug);
      setError('');
      alert('Successfully upgraded to Pro plan! You can now create unlimited notes.');
      // Reload user data to get updated plan
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upgrade plan');
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setEditTitle('');
    setEditContent('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notes Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Welcome to {user?.tenantName} • {user?.role} • {user?.tenantPlan.toUpperCase()} Plan
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {user?.role === 'admin' && user?.tenantPlan === 'free' && (
                <button
                  onClick={handleUpgrade}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Upgrade to Pro
                </button>
              )}
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Create Note Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {showCreateForm ? 'Cancel' : 'Create New Note'}
          </button>
        </div>

        {/* Create Note Form */}
        {showCreateForm && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Note</h3>
            <form onSubmit={handleCreateNote}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter note title"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  id="content"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter note content"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Note'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notes List */}
        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No notes yet</div>
              <p className="text-gray-400 mt-2">Create your first note to get started!</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-white rounded-lg shadow p-6">
                {editingNote?.id === note.id ? (
                  <form onSubmit={handleEditNote}>
                    <div className="mb-4">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-lg font-medium"
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{note.title}</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(note)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-red-600 hover:text-red-900 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                    <div className="mt-4 text-sm text-gray-500">
                      Created by {note.created_by} • Updated {new Date(note.updated_at).toLocaleDateString()}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
