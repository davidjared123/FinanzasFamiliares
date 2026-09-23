import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Wallet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';
import {
  getCategoryById,
  formatCurrency
} from '../constants/categories';

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700">
        <div className="flex items-center space-x-1.5 font-bold">
          <span>{data.badge}</span>
          <span>{data.name}</span>
        </div>
        <p className="text-slate-200">
          Monto: <span className="font-extrabold text-white">{formatCurrency(data.total)}</span>
        </p>
        <p className="text-slate-400 text-[10px]">
          {data.percentage}% del total • {data.count} registro{data.count !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

export default function ReportsView({
  transactions = [],
  members = [],
  onOpenTransactionModal
}) {
  const [period, setPeriod] = useState('this_month'); // 'this_month' | 'last_month' | 'last_3_months' | 'all'
  const [chartType, setChartType] = useState('bars'); // 'bars' | 'donut'

  // Filter transactions based on selected period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    return transactions.filter((tx) => {
      if (!tx.date) return true;
      const txDate = new Date(tx.date + 'T00:00:00');
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();

      if (period === 'this_month') {
        return txYear === currentYear && txMonth === currentMonth;
      }
      if (period === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return txYear === lastYear && txMonth === lastMonth;
      }
      if (period === 'last_3_months') {
        const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1);
        return txDate >= threeMonthsAgo && txDate <= now;
      }
      return true; // 'all'
    });
  }, [transactions, period]);

  // Aggregate Totals
  const { totalIncomes, totalExpenses, netBalance, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;

    filteredTransactions.forEach((tx) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'income') {
        inc += amt;
      } else {
        exp += amt;
      }
    });

    const net = inc - exp;
    const rate = inc > 0 ? Math.max(0, Math.round(((inc - exp) / inc) * 100)) : 0;

    return {
      totalIncomes: inc,
      totalExpenses: exp,
      netBalance: net,
      savingsRate: rate
    };
  }, [filteredTransactions]);

  // Aggregate and sort Expenses from HIGHEST to LOWEST
  const expensesByCategory = useMemo(() => {
    const map = {};

    filteredTransactions
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        const catId = tx.category || 'otros';
        const amt = Number(tx.amount) || 0;
        if (!map[catId]) {
          const catInfo = getCategoryById('expense', catId);
          map[catId] = {
            id: catId,
            name: catInfo.label,
            fullName: catInfo.fullLabel,
            color: catInfo.color,
            bgColor: catInfo.bgColor,
            textColor: catInfo.textColor,
            badge: catInfo.badge,
            total: 0,
            count: 0
          };
        }
        map[catId].total += amt;
        map[catId].count += 1;
      });

    // Sort strictly from highest to lowest amount
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        percentage: totalExpenses > 0 ? Math.round((item.total / totalExpenses) * 100) : 0
      }));
  }, [filteredTransactions, totalExpenses]);

  // Aggregate and sort Incomes from HIGHEST to LOWEST
  const incomesByCategory = useMemo(() => {
    const map = {};

    filteredTransactions
      .filter((tx) => tx.type === 'income')
      .forEach((tx) => {
        const catId = tx.category || 'otros_ingresos';
        const amt = Number(tx.amount) || 0;
        if (!map[catId]) {
          const catInfo = getCategoryById('income', catId);
          map[catId] = {
            id: catId,
            name: catInfo.label,
            fullName: catInfo.fullLabel,
            color: catInfo.color,
            bgColor: catInfo.bgColor,
            textColor: catInfo.textColor,
            badge: catInfo.badge,
            total: 0,
            count: 0
          };
        }
        map[catId].total += amt;
        map[catId].count += 1;
      });

    // Sort strictly from highest to lowest amount
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        percentage: totalIncomes > 0 ? Math.round((item.total / totalIncomes) * 100) : 0
      }));
  }, [filteredTransactions, totalIncomes]);

  // Breakdown by Member (David vs Esposa)
  const memberBreakdown = useMemo(() => {
    const map = {};

    members.forEach((m) => {
      map[m.uid] = {
        uid: m.uid,
        name: m.name || 'Usuario',
        color: m.color || '#3B82F6',
        avatar: m.avatar || '',
        incomes: 0,
        expenses: 0
      };
    });

    filteredTransactions.forEach((tx) => {
      const uid = tx.userId;
      const amt = Number(tx.amount) || 0;
      if (!map[uid]) {
        map[uid] = {
          uid: uid,
          name: tx.userName || 'Usuario',
          color: tx.userColor || '#64748B',
          avatar: tx.userAvatar || '',
          incomes: 0,
          expenses: 0
        };
      }
      if (tx.type === 'income') {
        map[uid].incomes += amt;
      } else {
        map[uid].expenses += amt;
      }
    });

    return Object.values(map);
  }, [filteredTransactions, members]);

  return (
    <div className="space-y-5 animate-fade-in pb-12 text-left">
      {/* Period Filter Tabs */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'this_month', label: 'Este Mes' },
          { id: 'last_month', label: 'Mes Pasado' },
          { id: 'last_3_months', label: 'Últimos 3 Meses' },
          { id: 'all', label: 'Histórico' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              period === p.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Incomes */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ingresos</span>
            <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-emerald-600">{formatCurrency(totalIncomes)}</p>
          <span className="text-[10px] text-slate-400 mt-1">Total acumulado</span>
        </div>

        {/* Total Expenses */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gastos</span>
            <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-rose-600">{formatCurrency(totalExpenses)}</p>
          <span className="text-[10px] text-slate-400 mt-1">Total egresos</span>
        </div>

        {/* Net Balance */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Balance Neto</span>
            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <p
            className={`text-xl font-extrabold ${
              netBalance >= 0 ? 'text-slate-800' : 'text-rose-600'
            }`}
          >
            {formatCurrency(netBalance)}
          </p>
          <span className="text-[10px] text-slate-400 mt-1">Diferencia neta</span>
        </div>

        {/* Savings Rate */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ahorro</span>
            <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-extrabold text-indigo-600">{savingsRate}%</p>
          <span className="text-[10px] text-slate-400 mt-1">
            {netBalance >= 0 ? 'Tasa positiva' : 'Gasto excede ingreso'}
          </span>
        </div>
      </div>

      {/* SECTION 1: EXPENSES (HIGHEST TO LOWEST) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Gastos: De Mayor a Menor
              </h3>
              <p className="text-[11px] text-slate-400">
                Qué es lo que más gasta la familia ordenado
              </p>
            </div>
          </div>

          <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setChartType('bars')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                chartType === 'bars' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Barras
            </button>
            <button
              onClick={() => setChartType('donut')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition ${
                chartType === 'donut' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Dona
            </button>
          </div>
        </div>

        {expensesByCategory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs space-y-2">
            <p>No hay gastos registrados en este período.</p>
            {onOpenTransactionModal && (
              <button
                type="button"
                onClick={() => onOpenTransactionModal('expense')}
                className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition"
              >
                + Registrar Gasto
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bars' ? (
                  <BarChart
                    layout="vertical"
                    data={expensesByCategory.slice(0, 6)}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={100}
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={18}>
                      {expensesByCategory.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#F43F5E'} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <RePieChart>
                    <Pie
                      data={expensesByCategory}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-pie-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RePieChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Ranked Breakdown List (From #1 Highest to Lowest) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                <span>Categoría & Puesto</span>
                <span>Monto & Proporción</span>
              </div>

              {expensesByCategory.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                          cat.rank === 1
                            ? 'bg-amber-100 text-amber-800'
                            : cat.rank === 2
                            ? 'bg-slate-200 text-slate-700'
                            : cat.rank === 3
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        #{cat.rank}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-base">{cat.badge}</span>
                        <span className="text-xs font-bold text-slate-800">{cat.fullName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-800 block">
                        {formatCurrency(cat.total)}
                      </span>
                      <span className="text-[10px] font-semibold text-rose-500">
                        {cat.percentage}% del total
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* SECTION 2: INCOMES (HIGHEST TO LOWEST) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Ingresos: Cuál Ingresa Más
              </h3>
              <p className="text-[11px] text-slate-400">
                Fuentes de ingreso ordenadas de mayor a menor
              </p>
            </div>
          </div>
        </div>

        {incomesByCategory.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No hay ingresos registrados en este período.
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="h-56 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={incomesByCategory}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={100}
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" radius={[0, 8, 8, 0]} barSize={18}>
                    {incomesByCategory.map((entry, index) => (
                      <Cell key={`cell-inc-${index}`} fill={entry.color || '#10B981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Ranked Breakdown List */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                <span>Fuente de Ingreso</span>
                <span>Monto & Proporción</span>
              </div>

              {incomesByCategory.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                          cat.rank === 1
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        #{cat.rank}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-base">{cat.badge}</span>
                        <span className="text-xs font-bold text-slate-800">{cat.fullName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-slate-800 block">
                        {formatCurrency(cat.total)}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600">
                        {cat.percentage}% de ingresos
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* SECTION 3: BREAKDOWN BY MEMBER (DAVID VS ESPOSA) */}
      {memberBreakdown.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Aportes y Gastos en Pareja
              </h3>
              <p className="text-[11px] text-slate-400">
                Transparencia de movimientos por cada miembro
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {memberBreakdown.map((m) => (
              <div
                key={m.uid}
                className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-xs overflow-hidden"
                    style={{ backgroundColor: m.color || '#3B82F6' }}
                  >
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      (m.name || 'U')[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{m.name}</h4>
                    <span className="text-[10px] text-slate-400">Miembro familiar</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Ingresó</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {formatCurrency(m.incomes)}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-rose-500 uppercase block">Gastó</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {formatCurrency(m.expenses)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
