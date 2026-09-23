import React from 'react';
import { Mail, Check, X, Users, Heart } from 'lucide-react';

/**
 * InvitationBanner
 * Shows a top-of-screen banner when the signed-in user has a pending in-app invitation.
 * Props:
 *   invitation  – { id, fromName, fromColor, fromAvatar, familyName, familyId, toEmail }
 *   onAccept(inviteId, familyId) – called when user accepts
 *   onDecline(inviteId)          – called when user declines
 */
export default function InvitationBanner({ invitation, onAccept, onDecline }) {
  if (!invitation) return null;

  const { id, fromName, fromColor, fromAvatar, familyName } = invitation;

  return (
    <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-3 pt-3 animate-slide-down">
      <div className="bg-white border border-indigo-200 rounded-2xl shadow-xl shadow-indigo-100/60 p-4 flex items-start space-x-3 relative overflow-hidden">
        {/* Gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/50 pointer-events-none" />

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-extrabold shrink-0 border-2 border-white shadow-md relative z-10 overflow-hidden"
          style={{ backgroundColor: fromColor || '#6366F1' }}
        >
          {fromAvatar ? (
            <img src={fromAvatar} alt={fromName} className="w-full h-full object-cover" />
          ) : (
            (fromName || '?')[0].toUpperCase()
          )}
        </div>

        {/* Text */}
        <div className="flex-1 relative z-10 min-w-0">
          <div className="flex items-center space-x-1 mb-0.5">
            <Mail className="w-3 h-3 text-indigo-500 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
              Invitación de pareja
            </span>
          </div>
          <p className="text-xs font-bold text-slate-800 leading-snug">
            <span style={{ color: fromColor || '#6366F1' }}>{fromName || 'Tu pareja'}</span>
            {' '}te invita a unirte a{' '}
            <span className="font-extrabold text-slate-900">"{familyName}"</span>
            {' '}<Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Verán y editarán las finanzas en tiempo real juntos.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 mt-2.5">
            <button
              type="button"
              onClick={() => onAccept(id, invitation.familyId)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Aceptar</span>
            </button>
            <button
              type="button"
              onClick={() => onDecline(id)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition active:scale-95"
            >
              <X className="w-3.5 h-3.5" />
              <span>Rechazar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
