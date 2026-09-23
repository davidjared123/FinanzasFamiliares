import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  CreditCard,
  Trash2,
  Check,
  TrendingDown,
  TrendingUp,
  Tag
} from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  formatCurrency
} from '../constants/categories';

export default function TransactionModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData = null,
  defaultType = 'expense',
  members = [],
  currentUser = null
}) {
  const [type, setType] = useState(defaultType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('tarjeta');
  const [selectedMemberUid, setSelectedMemberUid] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type || 'expense');
        setAmount(initialData.amount ? String(initialData.amount) : '');
        setCategory(initialData.category || '');
        setDescription(initialData.description || '');
        setDate(initialData.date || new Date().toISOString().split('T')[0]);
        setPaymentMethod(initialData.paymentMethod || 'tarjeta');
        setSelectedMemberUid(initialData.userId || currentUser?.uid || '');
      } else {
        setType(defaultType);
        setAmount('');
        const categories = defaultType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
        setCategory(categories[0]?.id || '');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('tarjeta');
        setSelectedMemberUid(currentUser?.uid || (members[0]?.uid || ''));
      }
      setConfirmDelete(false);
      setIsSubmitting(false);
    }
  }, [isOpen, initialData, defaultType, currentUser, members]);

  // When type changes, ensure valid category
  const handleTypeChange = (newType) => {
    setType(newType);
    const catList = newType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    if (!catList.some((c) => c.id === category)) {
      setCategory(catList[0]?.id || '');
    }
  };

  const handleQuickAddAmount = (addValue) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(Math.round((current + addValue) * 100) / 100));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor introduce un monto válido mayor a 0');
      return;
    }
    if (!category) {
      alert('Por favor selecciona una categoría');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedMember = members.find((m) => m.uid === selectedMemberUid) || {
        uid: currentUser?.uid,
        name: currentUser?.name || 'Usuario',
        color: currentUser?.color || '#3B82F6',
        avatar: currentUser?.avatar || ''
      };

      await onSave({
        ...(initialData ? { id: initialData.id } : {}),
        type,
        amount: parsedAmount,
        category,
        description: description.trim() || (type === 'expense' ? 'Gasto' : 'Ingreso'),
        date,
        paymentMethod,
        userId: selectedMember.uid,
        userName: selectedMember.name,
        userColor: selectedMember.color,
        userAvatar: selectedMember.avatar || ''
      });
      onClose();
    } catch (err) {
      console.error('Error guardando transacción:', err);
      alert('Hubo un error al guardar la transacción. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await onDelete(initialData.id);
      onClose();
    } catch (err) {
      console.error('Error eliminando:', err);
      alert('Error al eliminar la transacción');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                type === 'expense' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {type === 'expense' ? (
                <TrendingDown className="w-5 h-5" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {initialData ? 'Editar Registro' : type === 'expense' ? 'Nuevo Gasto' : 'Nuevo Ingreso'}
              </h2>
              <p className="text-xs text-slate-400">Finanzas Compartidas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Type Selector (Gasto vs Ingreso) */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                type === 'expense'
                  ? 'bg-white text-rose-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Gasto (Salida)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Ingreso (Entrada)</span>
            </button>
          </div>

          {/* Amount Display & Input */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Monto a registrar
            </span>
            <div className="flex items-center justify-center space-x-1">
              <span className={`text-2xl font-bold ${type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-3xl font-extrabold text-slate-800 bg-transparent text-center focus:outline-none w-48 placeholder-slate-300"
              />
            </div>
            {/* Quick buttons */}
            <div className="flex justify-center gap-1.5 mt-3 pt-3 border-t border-slate-200/60">
              {[5, 10, 20, 50, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleQuickAddAmount(v)}
                  className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-200 text-slate-600 rounded-lg border border-slate-200/80 transition"
                >
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                <span>Categoría {type === 'expense' ? 'del Gasto' : 'del Ingreso'}</span>
              </label>
              <span className="text-[11px] text-slate-400">Selecciona una</span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {currentCategories.map((cat) => {
                const isSelected = category === cat.id;
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all text-center group ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 shadow-xs ring-2 ring-indigo-500/20'
                        : 'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-1 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: isSelected ? cat.color : cat.bgColor,
                        color: isSelected ? '#ffffff' : cat.color
                      }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[11px] font-semibold leading-tight line-clamp-1 ${
                        isSelected ? 'text-indigo-900' : 'text-slate-600'
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description / Concept */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Descripción o Detalle
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'expense'
                  ? 'Ej. Supermercado semanal, Gasolina carro, Chocolates'
                  : 'Ej. Sueldo quincenal, Comisión venta, Proyecto extra'
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Date & Who paid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>Fecha</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                <span>Método</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="tarjeta">💳 Tarjeta (Débito/Crédito)</option>
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">📲 Transferencia</option>
              </select>
            </div>
          </div>

          {/* Member assignment (Who paid / earned) */}
          {members.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {type === 'expense' ? '¿Quién pagó?' : '¿Quién ingresó el dinero?'}
              </label>
              <div className="flex gap-2">
                {members.map((member) => {
                  const isSelected = selectedMemberUid === member.uid;
                  return (
                    <button
                      key={member.uid}
                      type="button"
                      onClick={() => setSelectedMemberUid(member.uid)}
                      className={`flex-1 py-2 px-3 rounded-xl border flex items-center space-x-2 transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-xs overflow-hidden"
                        style={{ backgroundColor: member.color || '#3B82F6' }}
                      >
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          (member.name || 'U')[0].toUpperCase()
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-indigo-900' : 'text-slate-600'
                        }`}
                      >
                        {member.name || 'Usuario'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center gap-3">
            {initialData && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1.5 ${
                  confirmDelete
                    ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700 animate-pulse'
                    : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{confirmDelete ? '¿Confirmar?' : 'Eliminar'}</span>
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-3.5 px-4 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 ${
                type === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Guardando...'
                  : initialData
                  ? 'Actualizar Registro'
                  : type === 'expense'
                  ? `Guardar Gasto ${amount ? '(' + formatCurrency(amount) + ')' : ''}`
                  : `Guardar Ingreso ${amount ? '(' + formatCurrency(amount) + ')' : ''}`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
