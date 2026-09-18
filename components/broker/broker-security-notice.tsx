import { ShieldAlert } from "lucide-react";

export function BrokerSecurityNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
      <div className="text-sm">
        <span className="font-semibold text-amber-400">Security Notice </span>
        <span className="text-amber-300/90">
          API keys are encrypted and stored securely on the server.
          They are{" "}
          <strong className="text-amber-300">never stored in your browser</strong>,
          never written to logs, and never returned in full from the API.
          Only masked values are displayed in this interface.
        </span>
      </div>
    </div>
  );
}
