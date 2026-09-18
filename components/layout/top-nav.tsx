"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClientSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Employee } from "@/types";
import {
  Search,
  Bell,
  LogOut,
  User,
  ChevronDown,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopNavProps {
  employee: Employee;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  TRADING_OPERATIONS: "Trading Ops",
  RISK_MANAGER: "Risk Manager",
  SUPPORT: "Support",
  VIEWER: "Viewer",
};

export function TopNav({ employee }: TopNavProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const client = createClientSupabaseClient();
      await client.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4 shrink-0">
      {/* Left: Title + search */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-foreground hidden md:block">
          Terminal OS
        </span>
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search accounts, orders…"
            className="pl-8 h-8 w-56 text-xs bg-background border-border"
            aria-label="Search Terminal OS"
          />
        </div>
      </div>

      {/* Right: Status + notifications + profile */}
      <div className="flex items-center gap-2">
        {/* System status indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
          <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            System Online
          </span>
        </div>

        {/* Notifications placeholder */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        {/* Employee profile menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
              menuOpen ? "bg-accent" : "hover:bg-accent"
            )}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Employee menu"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 border border-primary/30 shrink-0">
              <User className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="hidden md:block text-left leading-none">
              <p className="text-xs font-medium text-foreground truncate max-w-[120px]">
                {employee.full_name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {ROLE_LABELS[employee.role] ?? employee.role}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform hidden md:block",
                menuOpen && "rotate-180"
              )}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
              <div
                className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-border bg-popover shadow-lg z-20"
                role="menu"
              >
                <div className="px-3 py-2.5 border-b border-border">
                  <p className="text-xs font-medium text-foreground">
                    {employee.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{employee.email}</p>
                  <Badge variant="secondary" className="mt-1.5 text-[10px]">
                    {ROLE_LABELS[employee.role] ?? employee.role}
                  </Badge>
                </div>

                <div className="p-1">
                  <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    {isSigningOut ? "Signing out…" : "Sign Out"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
