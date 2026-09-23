import React from 'react';
import {
  ShoppingCart,
  Car,
  Smartphone,
  Candy,
  Zap,
  Home,
  HeartPulse,
  GraduationCap,
  Sparkles,
  ShoppingBag,
  MoreHorizontal,
  Briefcase,
  Store,
  TrendingUp,
  Tag,
  Gift,
  Wallet
} from 'lucide-react';

export const EXPENSE_CATEGORIES = [
  {
    id: 'comida',
    label: 'Comida & Super',
    fullLabel: 'Comida & Supermercado',
    icon: ShoppingCart,
    color: '#10B981',
    bgColor: '#ecfdf5',
    textColor: '#047857',
    badge: '🛒'
  },
  {
    id: 'carro',
    label: 'Carro & Transporte',
    fullLabel: 'Carro, Gasolina & Transporte',
    icon: Car,
    color: '#3B82F6',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    badge: '🚗'
  },
  {
    id: 'telefonos',
    label: 'Teléfonos & Net',
    fullLabel: 'Teléfonos, Internet & Comunicaciones',
    icon: Smartphone,
    color: '#8B5CF6',
    bgColor: '#f5f3ff',
    textColor: '#6d28d9',
    badge: '📱'
  },
  {
    id: 'dulces',
    label: 'Dulces & Antojos',
    fullLabel: 'Dulces, Postres & Antojos',
    icon: Candy,
    color: '#EC4899',
    bgColor: '#fdf2f8',
    textColor: '#be185d',
    badge: '🍬'
  },
  {
    id: 'servicios',
    label: 'Servicios',
    fullLabel: 'Servicios (Luz, Agua, Gas, Streaming)',
    icon: Zap,
    color: '#F59E0B',
    bgColor: '#fffbeb',
    textColor: '#b45309',
    badge: '💡'
  },
  {
    id: 'hogar',
    label: 'Hogar',
    fullLabel: 'Hogar, Muebles & Alquiler',
    icon: Home,
    color: '#06B6D4',
    bgColor: '#ecfeff',
    textColor: '#0e7490',
    badge: '🏠'
  },
  {
    id: 'salud',
    label: 'Salud & Farmacia',
    fullLabel: 'Salud, Consultas & Farmacia',
    icon: HeartPulse,
    color: '#F43F5E',
    bgColor: '#fff1f2',
    textColor: '#be123c',
    badge: '💊'
  },
  {
    id: 'educacion',
    label: 'Educación',
    fullLabel: 'Educación, Cursos & Colegio',
    icon: GraduationCap,
    color: '#6366F1',
    bgColor: '#eef2ff',
    textColor: '#4338ca',
    badge: '📚'
  },
  {
    id: 'compras',
    label: 'Ropa & Compras',
    fullLabel: 'Ropa, Calzado & Compras Personales',
    icon: ShoppingBag,
    color: '#A855F7',
    bgColor: '#faf5ff',
    textColor: '#7e22ce',
    badge: '🛍️'
  },
  {
    id: 'ocio',
    label: 'Salidas & Ocio',
    fullLabel: 'Salidas, Cines & Entretenimiento',
    icon: Sparkles,
    color: '#FB923C',
    bgColor: '#fff7ed',
    textColor: '#c2410c',
    badge: '🎉'
  },
  {
    id: 'otros',
    label: 'Otros Gastos',
    fullLabel: 'Otros Gastos Varios',
    icon: MoreHorizontal,
    color: '#64748B',
    bgColor: '#f8fafc',
    textColor: '#475569',
    badge: '✨'
  }
];

export const INCOME_CATEGORIES = [
  {
    id: 'salario',
    label: 'Salario / Sueldo',
    fullLabel: 'Salario o Sueldo Fijo',
    icon: Briefcase,
    color: '#10B981',
    bgColor: '#ecfdf5',
    textColor: '#047857',
    badge: '💼'
  },
  {
    id: 'negocio',
    label: 'Negocio',
    fullLabel: 'Negocio o Emprendimiento',
    icon: Store,
    color: '#3B82F6',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    badge: '🏪'
  },
  {
    id: 'inversiones',
    label: 'Inversiones',
    fullLabel: 'Inversiones & Rendimientos',
    icon: TrendingUp,
    color: '#8B5CF6',
    bgColor: '#f5f3ff',
    textColor: '#6d28d9',
    badge: '📈'
  },
  {
    id: 'ventas',
    label: 'Ventas Extras',
    fullLabel: 'Ventas & Trabajos Adicionales',
    icon: Tag,
    color: '#F59E0B',
    bgColor: '#fffbeb',
    textColor: '#b45309',
    badge: '🏷️'
  },
  {
    id: 'bonos',
    label: 'Bonos / Regalos',
    fullLabel: 'Bonos, Aguinaldos o Regalos',
    icon: Gift,
    color: '#EC4899',
    bgColor: '#fdf2f8',
    textColor: '#be185d',
    badge: '🎁'
  },
  {
    id: 'otros_ingresos',
    label: 'Otros Ingresos',
    fullLabel: 'Otros Ingresos Varios',
    icon: Wallet,
    color: '#64748B',
    bgColor: '#f8fafc',
    textColor: '#475569',
    badge: '💵'
  }
];

export const getCategoryById = (type, categoryId) => {
  const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const found = list.find((c) => c.id === categoryId);
  if (found) return found;

  return {
    id: categoryId || 'otros',
    label: categoryId || 'Varios',
    fullLabel: categoryId || 'Varios',
    icon: MoreHorizontal,
    color: '#64748B',
    bgColor: '#f8fafc',
    textColor: '#475569',
    badge: type === 'income' ? '💵' : '💸'
  };
};

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num).replace('US$', '$');
};
