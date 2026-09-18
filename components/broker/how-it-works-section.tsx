import { Server, ShieldCheck, Zap } from "lucide-react";

export function HowItWorksSection() {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">How It Works</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Secure Storage</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Credentials are AES-256 encrypted server-side. Never stored in
              your browser, session, localStorage, or logs.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/20">
            <Server className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Server-Side Only</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              All broker API calls originate from the Terminal OS backend.
              Your browser only receives masked values for display.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/20">
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Dhan Only (Live)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Only Dhan has a live runtime backend integration. The other six
              providers store credentials for future integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
