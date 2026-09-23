import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Mail,
  Users,
  ShieldCheck,
  Send,
  Trash2,
  UserPlus,
  Smartphone,
  MessageCircle,
  FileText
} from 'lucide-react';

// Robust clipboard copy with fallback for all devices and browsers
async function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText failed, trying fallback', e);
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Fallback copy failed', err);
    return false;
  }
}

export default function InviteModal({
  isOpen,
  onClose,
  family,
  members = [],
  onInviteEmail,
  onRemoveInvitedEmail,
  onJoinWithCode
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFullMessage, setCopiedFullMessage] = useState(false);
  const [emailToInvite, setEmailToInvite] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [inputJoinCode, setInputJoinCode] = useState('');
  const [showJoinOther, setShowJoinOther] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [shareSuccessFeedback, setShareSuccessFeedback] = useState('');

  if (!isOpen) return null;

  const activeFamily = family || {
    id: 'FAM-PENDING',
    name: 'Finanzas Familiares',
    inviteCode: 'FAM-SYNC',
    invitedEmails: []
  };

  const inviteCode = activeFamily.inviteCode || activeFamily.id || 'FAM-12345';
  const shareUrl = `${window.location.origin}${window.location.pathname}?join=${inviteCode}`;

  const invitationMessage = `¡Hola mi amor! Te invito a compartir nuestras finanzas familiares en tiempo real. Entra con este enlace para unirte: ${shareUrl} o usa el código: ${inviteCode}`;

  // 1. Native Mobile Share Sheet (WhatsApp, Email, SMS, Telegram, etc.)
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({
          title: 'Finanzas Familiares en Pareja',
          text: invitationMessage,
          url: shareUrl
        });
        setShareSuccessFeedback('¡Enviado con éxito!');
        setTimeout(() => setShareSuccessFeedback(''), 3000);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error with navigator.share:', err);
          handleShareWhatsApp();
        }
      }
    } else {
      // Fallback directly to WhatsApp
      handleShareWhatsApp();
    }
  };

  // 2. Direct WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(invitationMessage);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // 3. Direct Email Client (Mailto)
  const handleShareEmailClient = () => {
    const subject = encodeURIComponent('Invitación para compartir nuestras Finanzas Familiares');
    const body = encodeURIComponent(
      `¡Hola!\n\nTe invito a que llevemos nuestras finanzas y gastos familiares juntos en tiempo real.\n\nPuedes entrar directamente desde este enlace:\n${shareUrl}\n\nO si te pide código al iniciar sesión, usa: ${inviteCode}\n\n¡Un abrazo!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // 4. Copy URL
  const handleCopyLink = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // 5. Copy Code
  const handleCopyCode = async () => {
    const ok = await copyToClipboard(inviteCode);
    if (ok) {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // 6. Copy Full Message
  const handleCopyFullMessage = async () => {
    const ok = await copyToClipboard(invitationMessage);
    if (ok) {
      setCopiedFullMessage(true);
      setTimeout(() => setCopiedFullMessage(false), 2500);
    }
  };

  // 7. Add Wife's Email to pending invites
  const handleSendEmailInvite = async (e) => {
    e.preventDefault();
    if (!emailToInvite.trim() || !emailToInvite.includes('@')) {
      alert('Por favor ingresa un correo electrónico válido');
      return;
    }
    setIsSendingEmail(true);
    try {
      if (onInviteEmail) {
        await onInviteEmail(emailToInvite.trim().toLowerCase());
      }
      setEmailToInvite('');
      alert(`¡Invitación guardada para ${emailToInvite}! En cuanto tu pareja inicie sesión con su cuenta de Google, se unirá automáticamente.`);
    } catch (err) {
      console.error(err);
      alert('Error guardando la invitación por correo');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // 8. Join existing family with code
  const handleJoinExisting = async (e) => {
    e.preventDefault();
    if (!inputJoinCode.trim()) return;
    setIsJoining(true);
    try {
      if (onJoinWithCode) {
        await onJoinWithCode(inputJoinCode.trim());
      }
      onClose();
    } catch (err) {
      alert(err.message || 'Código de invitación no válido o familia no encontrada');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Invitar a tu Pareja</h2>
              <p className="text-xs text-slate-400">Espacio: {activeFamily.name || 'Familia'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-left">
          {/* Explanation Box */}
          <div className="bg-gradient-to-r from-indigo-50/80 to-purple-50/80 p-4 rounded-2xl border border-indigo-100 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div className="text-xs text-indigo-950 space-y-1">
              <p className="font-semibold text-indigo-900">
                Sincronización Total en Pareja
              </p>
              <p className="text-indigo-800/80 leading-relaxed">
                Al invitar a tu esposa, ambos verán, registrarán y editarán en vivo los mismos gastos, ingresos y gráficas desde el teléfono o PC.
              </p>
            </div>
          </div>

          {/* MAIN PROMINENT BUTTON: SEND FROM PHONE (Web Share API) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Opción Rápida: Enviar desde tu Teléfono
            </label>
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-indigo-200 transition flex items-center justify-center space-x-2.5 active:scale-98"
            >
              <Smartphone className="w-5 h-5" />
              <span>Enviar por WhatsApp, Email u otras Apps</span>
            </button>
            {shareSuccessFeedback && (
              <p className="text-xs text-center text-emerald-600 font-bold animate-fade-in">
                {shareSuccessFeedback}
              </p>
            )}
          </div>

          {/* Quick Direct Buttons (WhatsApp & Email fallback) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-98"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Abrir WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleShareEmailClient}
              className="py-2.5 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-98"
            >
              <Mail className="w-4 h-4 text-sky-600" />
              <span>Enviar por Email</span>
            </button>
          </div>

          {/* Option: Copy Direct Link */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Copiar Enlace Directo
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition active:scale-95 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Option: Copy Full Ready-To-Paste Message */}
          <div>
            <button
              type="button"
              onClick={handleCopyFullMessage}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1.5 transition ${
                copiedFullMessage
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {copiedFullMessage ? <Check className="w-4 h-4 text-emerald-600" /> : <FileText className="w-4 h-4 text-slate-500" />}
              <span>{copiedFullMessage ? '¡Mensaje completo copiado!' : 'Copiar mensaje con texto explicativo listo para pegar'}</span>
            </button>
          </div>

          {/* Option: 6-Digit Code */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Código de Familia
            </label>
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                  Código de 6 Caracteres
                </span>
                <span className="text-lg font-mono font-extrabold text-slate-800 tracking-wider">
                  {inviteCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition active:scale-95 ${
                  copiedCode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? '¡Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>
          </div>

          {/* Option: Invite by Email (Auto-sync) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              O Invitar escribiendo su Correo
            </label>
            <form onSubmit={handleSendEmailInvite} className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={emailToInvite}
                  onChange={(e) => setEmailToInvite(e.target.value)}
                  placeholder="ejemplo: esposa@gmail.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={isSendingEmail}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingEmail ? 'Guardando...' : 'Invitar'}</span>
              </button>
            </form>
            <p className="text-[11px] text-slate-400">
              En cuanto tu esposa inicie sesión con Google usando ese correo, se vinculará de forma automática.
            </p>
          </div>

          {/* Current Members and Pending Invites */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Miembros Actuales ({members.length})</span>
            </h3>

            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.uid}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs overflow-hidden"
                      style={{ backgroundColor: m.color || '#3B82F6' }}
                    >
                      {m.avatar ? (
                        <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        (m.name || 'U')[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{m.name || 'Usuario'}</p>
                      <p className="text-[11px] text-slate-400">{m.email || 'Miembro activo'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    Conectado
                  </span>
                </div>
              ))}

              {/* Pending emails */}
              {activeFamily.invitedEmails && activeFamily.invitedEmails.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Invitaciones pendientes:
                  </span>
                  {activeFamily.invitedEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-amber-200/60 bg-amber-50/50 text-xs"
                    >
                      <div className="flex items-center space-x-2 text-amber-900">
                        <Mail className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-medium text-xs truncate">{email}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                          Esperando inicio
                        </span>
                        {onRemoveInvitedEmail && (
                          <button
                            type="button"
                            onClick={() => onRemoveInvitedEmail(email)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition"
                            title="Cancelar invitación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Join Another Family Accordion */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowJoinOther(!showJoinOther)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showJoinOther ? 'Ocultar' : '¿Quieres unirte a otra familia existente con código?'}</span>
            </button>

            {showJoinOther && (
              <form onSubmit={handleJoinExisting} className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <p className="text-[11px] text-slate-500">
                  Si tu pareja ya creó la familia y tienes su código, escríbelo aquí para unirte a ella:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputJoinCode}
                    onChange={(e) => setInputJoinCode(e.target.value.toUpperCase())}
                    placeholder="FAM-XXXXX"
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isJoining}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {isJoining ? 'Uniendo...' : 'Unirme'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
