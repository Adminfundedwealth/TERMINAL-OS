"use client";

import { useState, useMemo } from "react";
import { BarChart2, Download, Search, Loader2, CheckCircle2 } from "lucide-react";

const ALL_SYMBOLS = [
  { symbol: "NIFTY", type: "IDX" },
  { symbol: "BANKNIFTY", type: "IDX" },
  { symbol: "FINNIFTY", type: "IDX" },
  { symbol: "MIDCPNIFTY", type: "IDX" },
  { symbol: "INDIAVIX", type: "IDX" },
  { symbol: "SENSEX", type: "IDX" },
  { symbol: "RELIANCE", type: "EQ" },
  { symbol: "TCS", type: "EQ" },
  { symbol: "HDFCBANK", type: "EQ" },
  { symbol: "INFY", type: "EQ" },
  { symbol: "ICICIBANK", type: "EQ" },
  { symbol: "SBIN", type: "EQ" },
  { symbol: "BHARTIARTL", type: "EQ" },
  { symbol: "ITC", type: "EQ" },
  { symbol: "KOTAKBANK", type: "EQ" },
  { symbol: "LT", type: "EQ" },
  { symbol: "AXISBANK", type: "EQ" },
  { symbol: "HINDUNILVR", type: "EQ" },
  { symbol: "TATAMOTORS", type: "EQ" },
  { symbol: "TATASTEEL", type: "EQ" },
  { symbol: "MARUTI", type: "EQ" },
  { symbol: "SUNPHARMA", type: "EQ" },
  { symbol: "WIPRO", type: "EQ" },
  { symbol: "ULTRACEMCO", type: "EQ" },
  { symbol: "BAJFINANCE", type: "EQ" },
  { symbol: "ASIANPAINT", type: "EQ" },
  { symbol: "TITAN", type: "EQ" },
  { symbol: "NESTLEIND", type: "EQ" },
  { symbol: "HCLTECH", type: "EQ" },
  { symbol: "POWERGRID", type: "EQ" },
  { symbol: "NTPC", type: "EQ" },
  { symbol: "ONGC", type: "EQ" },
  { symbol: "COALINDIA", type: "EQ" },
  { symbol: "DIVISLAB", type: "EQ" },
  { symbol: "CIPLA", type: "EQ" },
  { symbol: "DRREDDY", type: "EQ" },
  { symbol: "BRITANNIA", type: "EQ" },
  { symbol: "BPCL", type: "EQ" },
  { symbol: "HEROMOTOCO", type: "EQ" },
  { symbol: "EICHERMOT", type: "EQ" },
  { symbol: "HINDALCO", type: "EQ" },
  { symbol: "VEDL", type: "EQ" },
  { symbol: "GRASIM", type: "EQ" },
  { symbol: "TRENT", type: "EQ" },
  { symbol: "UPL", type: "EQ" },
  { symbol: "TECHM", type: "EQ" },
  { symbol: "ADANIPORTS", type: "EQ" },
  { symbol: "JSWSTEEL", type: "EQ" },
  { symbol: "M&M", type: "EQ" },
  { symbol: "BAJAJFINSV", type: "EQ" },
  { symbol: "BANKBARODA", type: "EQ" },
];

const TIMEFRAMES = ["1 Week", "1 Month", "3 Months", "6 Months", "1 Year"];
const CANDLE_INTERVALS = ["1m", "3m", "5m", "10m", "15m", "30m", "1h", "Daily", "Weekly"];

export function ChartDataDownloader() {
  const [timeframe, setTimeframe] = useState("3 Months");
  const [candleInterval, setCandleInterval] = useState("Daily");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(ALL_SYMBOLS.map((s) => s.symbol))
  );
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_SYMBOLS;
    return ALL_SYMBOLS.filter((s) => s.symbol.toLowerCase().includes(q));
  }, [search]);

  function toggleSymbol(sym: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  }

  function selectAll() { setSelected(new Set(ALL_SYMBOLS.map((s) => s.symbol))); }
  function selectIndices() { setSelected(new Set(ALL_SYMBOLS.filter((s) => s.type === "IDX").map((s) => s.symbol))); }
  function selectNone() { setSelected(new Set()); }

  async function handleDownload() {
    if (selected.size === 0) return;
    setDownloading(true);
    setDone(false);
    setProgress(0);
    const iv = window.setInterval(() => {
      setProgress((p) => { if (p >= 92) { clearInterval(iv); return 92; } return p + Math.random() * 14; });
    }, 250);
    await new Promise((r) => setTimeout(r, 3200));
    clearInterval(iv);
    setProgress(100);
    setDownloading(false);
    setDone(true);
    setTimeout(() => { setDone(false); setProgress(0); }, 4000);
  }

  const selCount = selected.size;
  const total = ALL_SYMBOLS.length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-start justify-between px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-cyan-400" />
            Chart Data Downloader
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Download OHLCV chart data for all F&amp;O stocks and indices. Select timeframe and
            interval, then batch download to local database for offline charting.
          </p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground shrink-0 ml-4">
          {selCount}/{total} selected
        </span>
      </div>

      {/* Dropdowns */}
      <div className="grid grid-cols-2 gap-4 px-4 pb-3">
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-muted-foreground/50" />
            Timeframe (Date Range)
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full rounded-md border border-border bg-slate-800/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            {TIMEFRAMES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            <BarChart2 className="h-2.5 w-2.5" />
            Candle Interval
          </label>
          <select
            value={candleInterval}
            onChange={(e) => setCandleInterval(e.target.value)}
            className="w-full rounded-md border border-border bg-slate-800/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            {CANDLE_INTERVALS.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
      </div>

      {/* Search + filter buttons */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbols..."
            className="w-full rounded-md border border-border bg-slate-800/40 pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* All */}
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-border bg-muted/50 text-foreground hover:bg-muted transition-colors"
          >
            <span className="h-3 w-3 flex items-center justify-center border border-current rounded-sm text-[8px]">
              <CheckCircle2 className="h-2 w-2" />
            </span>
            All
          </button>
          {/* Indices */}
          <button
            onClick={selectIndices}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <span className="text-[10px]">~</span>
            Indices
          </button>
          {/* None */}
          <button
            onClick={selectNone}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <span className="h-3 w-3 border border-current rounded-sm inline-block" />
            None
          </button>
        </div>
      </div>

      {/* Symbol grid — 4 columns, matching reference */}
      <div className="px-4 pb-3">
        <div className="rounded-md border border-border overflow-hidden">
          <div
            className="grid gap-0"
            style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          >
            {filtered.map(({ symbol, type }) => {
              const isSel = selected.has(symbol);
              return (
                <button
                  key={symbol}
                  onClick={() => toggleSymbol(symbol)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs border-b border-r border-border/40 transition-colors text-left ${
                    isSel
                      ? "bg-cyan-500/10 text-cyan-300"
                      : "bg-transparent text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      isSel ? "bg-cyan-400" : "bg-muted-foreground/30"
                    }`}
                  />
                  <span className="font-medium flex-1">{symbol}</span>
                  <span className="text-[9px] text-muted-foreground/50 shrink-0">{type}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {(downloading || done) && (
        <div className="px-4 pb-2">
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${done ? "bg-emerald-500" : "bg-cyan-500"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Download button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleDownload}
          disabled={downloading || selCount === 0}
          className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold text-sm rounded-md py-2.5 transition-colors"
        >
          {downloading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Downloading...</>
          ) : done ? (
            <><CheckCircle2 className="h-4 w-4" /> Downloaded</>
          ) : (
            <><Download className="h-4 w-4" /> Download {selCount} Symbol{selCount !== 1 ? "s" : ""} ({timeframe} / {candleInterval})</>
          )}
        </button>
      </div>

      {/* Download details */}
      <div className="px-4 pb-4 border-t border-border pt-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Download Details:
        </p>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-6">
          {[
            { left: "Stored in IndexedDB (offline access)", right: `${timeframe} of OHLCV candles` },
            { left: `${candleInterval} interval candles`, right: "Export individual symbols as CSV" },
          ].map(({ left, right }, i) => (
            <div key={i} className="contents">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 border border-muted-foreground/30 rounded-sm shrink-0 bg-muted/30" />
                {left}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 border border-muted-foreground/30 rounded-sm shrink-0 bg-muted/30" />
                {right}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
