import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('es-VE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function fmtBs(n) { return fmt(n, 2); }
function fmtUsd(n) { return fmt(n, 4); }

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function BcvConverter() {
  const [rate, setRate]         = useState(null); // BsS per 1 USD (today)
  const [prevRate, setPrevRate] = useState(null);
  const [changePercent, setChangePercent] = useState(null);
  const [rateDate, setRateDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Converter state
  const [mode, setMode]         = useState('bs_to_usd'); // 'bs_to_usd' | 'usd_to_bs'
  const [inputValue, setInputValue] = useState('');

  // ── Fetch rate ──────────────────────────────────────────────────────────────
  const fetchRate = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('https://rates.dolarvzla.com/bcv/current.json', {
        cache: 'no-cache'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const today = json?.current?.usd;
      const prev  = json?.previous?.usd;
      const chg   = json?.changePercentage?.usd;
      const date  = json?.current?.date;
      if (!today) throw new Error('Respuesta inválida');
      setRate(today);
      setPrevRate(prev ?? null);
      setChangePercent(chg ?? null);
      setRateDate(date ?? '');
      setLastFetched(new Date());
    } catch (err) {
      console.error('BCV fetch error:', err);
      setError('No se pudo obtener la tasa. Verifica tu conexión.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Auto-refresh: on mount + once per hour ─────────────────────────────────
  useEffect(() => {
    fetchRate();
    const timer = setInterval(() => fetchRate(true), 60 * 60 * 1000); // cada hora
    return () => clearInterval(timer);
  }, [fetchRate]);

  // ── Computed conversion ─────────────────────────────────────────────────────
  const numericInput = parseFloat(inputValue.replace(',', '.')) || 0;
  const converted = rate
    ? mode === 'bs_to_usd'
      ? numericInput / rate
      : numericInput * rate
    : null;

  const handleSwap = () => {
    setMode((m) => (m === 'bs_to_usd' ? 'usd_to_bs' : 'bs_to_usd'));
    setInputValue('');
  };

  // ── Trend indicator ─────────────────────────────────────────────────────────
  const isUp   = changePercent > 0.001;
  const isDown = changePercent < -0.001;

  // ── Date display ────────────────────────────────────────────────────────────
  const formattedDate = rateDate
    ? new Date(rateDate + 'T12:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-400 p-4 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />

        <div className="flex items-center justify-between relative">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-100 mb-0.5">
              Tasa Oficial BCV
            </p>
            {isLoading ? (
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span className="text-xs text-amber-100">Cargando tasa...</span>
              </div>
            ) : error ? (
              <div className="flex items-center space-x-1.5 text-amber-100 text-xs mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Sin conexión</span>
              </div>
            ) : (
              <>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-black tracking-tight">
                    Bs. {fmtBs(rate)}
                  </span>
                  <span className="text-xs font-semibold text-amber-100">/ 1 USD</span>
                </div>

                {/* Trend */}
                {changePercent !== null && (
                  <div className="flex items-center space-x-1.5 mt-1">
                    <span
                      className={`flex items-center space-x-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isUp
                          ? 'bg-red-500/30 text-red-100'
                          : isDown
                          ? 'bg-emerald-500/30 text-emerald-100'
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {isUp ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : isDown ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <Minus className="w-3 h-3" />
                      )}
                      <span>
                        {isUp ? '+' : ''}{fmt(changePercent, 3)}%
                      </span>
                    </span>
                    <span className="text-[10px] text-amber-200">
                      vs ayer (Bs. {fmtBs(prevRate)})
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => fetchRate()}
            disabled={isLoading}
            title="Actualizar tasa"
            className="w-9 h-9 bg-white/20 hover:bg-white/30 active:scale-95 rounded-xl flex items-center justify-center transition shrink-0"
          >
            <RefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Date */}
        {formattedDate && !isLoading && !error && (
          <p className="text-[10px] text-amber-200 mt-2 capitalize">
            📅 {formattedDate}
            {lastFetched && (
              <span className="ml-1.5 opacity-70">
                · actualizado {lastFetched.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── Converter body ── */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Convertidor
          </span>
          {/* Mode toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => { setMode('bs_to_usd'); setInputValue(''); }}
              className={`px-2.5 py-1 rounded-lg transition ${
                mode === 'bs_to_usd'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Bs → $
            </button>
            <button
              type="button"
              onClick={() => { setMode('usd_to_bs'); setInputValue(''); }}
              className={`px-2.5 py-1 rounded-lg transition ${
                mode === 'usd_to_bs'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              $ → Bs
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-400">
            {mode === 'bs_to_usd' ? 'Bs.' : '$'}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="0.00"
            disabled={!rate || isLoading}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition disabled:opacity-50"
          />
        </div>

        {/* Swap arrow */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleSwap}
            disabled={!rate || isLoading}
            className="w-8 h-8 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center justify-center transition active:scale-95 disabled:opacity-40"
          >
            <ArrowLeftRight className="w-4 h-4 text-amber-600" />
          </button>
        </div>

        {/* Result */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            {mode === 'bs_to_usd' ? 'Equivale en dólares' : 'Equivale en bolívares'}
          </span>
          <span className="text-lg font-black text-slate-800">
            {!rate || isLoading ? (
              <span className="text-slate-300">—</span>
            ) : !inputValue || numericInput === 0 ? (
              <span className="text-slate-300">0.00</span>
            ) : (
              <>
                <span className="text-amber-600 mr-1 text-sm font-bold">
                  {mode === 'bs_to_usd' ? '$' : 'Bs.'}
                </span>
                {mode === 'bs_to_usd' ? fmtUsd(converted) : fmtBs(converted)}
              </>
            )}
          </span>
        </div>

        {/* Quick presets */}
        {rate && !isLoading && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {mode === 'bs_to_usd' ? 'Equivalencias rápidas' : 'Equivalencias rápidas'}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {(mode === 'bs_to_usd'
                ? [100, 500, 1000, 5000]
                : [1, 5, 10, 50]
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInputValue(String(preset))}
                  className="py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-100 text-[11px] font-bold text-amber-800 transition active:scale-95"
                >
                  {mode === 'bs_to_usd' ? `Bs ${preset}` : `$ ${preset}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer source */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <p className="text-[10px] text-slate-400">
            Fuente: BCV vía DolarVZLA • Se actualiza c/hora
          </p>
          <a
            href="https://www.bcv.org.ve"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-0.5 text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold transition"
          >
            <span>BCV.org.ve</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
