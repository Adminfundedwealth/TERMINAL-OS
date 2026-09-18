"use client";

import { useState } from "react";
import { Database, Download, Clock, TrendingUp, BarChart2, Loader2, CheckCircle2 } from "lucide-react";

export function MarketDatabasePanel() {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleDownload() {
    setDownloading(true);
    setDone(false);
    setProgress(0);
    const iv = window.setInterval(() => {
      setProgress((p) => { if (p >= 92) { clearInterval(iv); return 92; } return p + Math.random() * 15; });
    }, 300);
    await new Promise((r) => setTimeout(r, 3000));
    clearInterval(iv);
    setProgress(100);
    setDownloading(false);
    setDone(true);
    setTimeout(() => { setDone(false); setProgress(0); }, 4000);
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Database className="h-4 w-4 text-cyan-400" />
          Market Database
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Download and store F&amp;O instruments, prices, and candle history locally for instant access.
          Data persists offline and powers charts, watchlist, and analytics.
        </p>
      </div>

      {/* Stats — 3 columns with dividers, exactly like reference */}
      <div className="grid grid-cols-3 border-t border-b border-border">
        {[
          { label: "Instruments", icon: Database },
          { label: "Prices", icon: TrendingUp },
          { label: "Candle Charts", icon: BarChart2 },
        ].map(({ label, icon: Icon }, i) => (
          <div
            key={label}
            className={`px-4 py-3 ${i < 2 ? "border-r border-border" : ""}`}
          >
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <p className="text-sm font-semibold text-foreground">-</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground">Never</span>
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {(downloading || done) && (
        <div className="px-4 pt-3">
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${done ? "bg-emerald-500" : "bg-cyan-500"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {done ? "Download complete" : `Downloading... ${Math.round(progress)}%`}
          </p>
        </div>
      )}

      {/* Download button */}
      <div className="px-4 py-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-900 font-semibold text-sm rounded-md py-2.5 transition-colors"
        >
          {downloading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Downloading...</>
          ) : done ? (
            <><CheckCircle2 className="h-4 w-4" /> Downloaded</>
          ) : (
            <><Download className="h-4 w-4" /> Download Database</>
          )}
        </button>
      </div>

      {/* What gets stored */}
      <div className="px-4 pb-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          What gets stored:
        </p>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-6">
          {[
            { left: "NSE F&O instrument master", right: "Live F&O price snapshots" },
            { left: "2-day index candles (5m)", right: "Top 10 F&O stock candles" },
          ].map(({ left, right }, i) => (
            <div key={i} className="contents">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 border border-cyan-500/40 bg-cyan-500/10 rounded-sm shrink-0" />
                {left}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="h-2 w-2 border border-cyan-500/40 bg-cyan-500/10 rounded-sm shrink-0" />
                {right}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
