import React, { useState, useEffect } from 'react';
import {
  StickyNote,
  Edit2,
  Check,
  X,
  Trash2,
  Heart,
  Sparkles,
  Clock
} from 'lucide-react';

export default function SharedNoteCard({
  note = '',
  noteAuthorName = '',
  noteAuthorColor = '#EC4899',
  noteUpdatedAt = null,
  currentUser = null,
  onSaveNote,
  onDeleteNote
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setText(note || '');
  }, [note]);

  const handleStartEdit = () => {
    setText(note || '');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setText(note || '');
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveNote(text);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Error guardando la nota');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Quieres borrar la nota actual?')) {
      setIsSaving(true);
      try {
        await onDeleteNote();
        setText('');
        setIsEditing(false);
      } catch (err) {
        console.error(err);
        alert('Error borrando la nota');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleAddEmoji = (emoji) => {
    setText((prev) => prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + emoji + ' ');
  };

  const formattedDate = () => {
    if (!noteUpdatedAt) return '';
    try {
      const date = new Date(noteUpdatedAt);
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const hasNote = Boolean(note && note.trim());

  return (
    <div className="bg-gradient-to-br from-amber-50/80 via-white to-rose-50/50 border border-amber-200/60 rounded-3xl p-4 shadow-xs relative overflow-hidden transition-all text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <StickyNote className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-1">
              <span>Nota para mi Pareja</span>
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
            </h3>
            {hasNote && noteAuthorName && (
              <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                <span>Por</span>
                <span
                  className="font-bold px-1 rounded text-white text-[9px]"
                  style={{ backgroundColor: noteAuthorColor || '#EC4899' }}
                >
                  {noteAuthorName}
                </span>
                {noteUpdatedAt && (
                  <>
                    <span>•</span>
                    <Clock className="w-2.5 h-2.5 inline" />
                    <span>{formattedDate()}</span>
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="text-xs font-semibold text-slate-500 hover:text-indigo-600 bg-white/80 border border-slate-200/80 hover:border-indigo-300 py-1 px-2.5 rounded-xl shadow-2xs transition flex items-center space-x-1"
          >
            <Edit2 className="w-3 h-3" />
            <span>{hasNote ? 'Editar' : 'Escribir'}</span>
          </button>
        )}
      </div>

      {/* Note Body */}
      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-3 pt-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe un mensajito, recordatorio o pendiente para tu pareja... ej. 'Amor, acuérdate de pagar el carro hoy 💕'"
            rows={3}
            autoFocus
            className="w-full p-3 bg-white border border-amber-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none shadow-2xs font-medium leading-relaxed"
          />

          {/* Quick emoji and preset helpers */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {['💕', '🛒', '📌', '💡', '🚗', '✨', '☕'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleAddEmoji(emoji)}
                  className="text-sm p-1 rounded-lg bg-white border border-slate-200/70 hover:bg-slate-100 transition"
                  title="Insertar emoji"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-1.5 ml-auto">
              {hasNote && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition"
                  title="Borrar nota"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="py-1.5 px-3 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || !text.trim()}
                className="py-1.5 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div
          onClick={handleStartEdit}
          className="cursor-pointer group rounded-2xl p-2.5 -mx-1 hover:bg-white/60 transition"
        >
          {hasNote ? (
            <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
              “{note}”
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Toca aquí para dejarle una nota o mensajito a tu pareja...</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
