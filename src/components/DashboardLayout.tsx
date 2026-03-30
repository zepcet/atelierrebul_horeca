import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { LogOut } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import PeriodSelector from "@/components/dashboard/PeriodSelector";
import { useLeadStore } from "@/hooks/useLeadStore";
import type { DashboardContext } from "@/hooks/useLeadStore";

export type { DashboardContext };

export default function DashboardLayout() {
  const ctx = useLeadStore();

  return (
    <SidebarProvider>
      <div className="flex h-svh min-h-0 w-full overflow-hidden">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-5">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <img src={logo} alt="Reflect Studio Merch" className="h-6 max-w-[220px] object-contain object-left brightness-0" />
              <div className="h-6 w-px bg-border" />
              <h1 className="text-base font-semibold text-foreground tracking-tight">Lead Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <PeriodSelector selected={ctx.period} onSelect={ctx.setPeriod} onSync={ctx.handleSync} isSyncing={ctx.isSyncing} lastSyncTime={ctx.lastSyncTime} />
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground font-medium">Live</span>
              </div>
              <button onClick={() => supabase.auth.signOut()} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted" title="Sign out">
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-auto">
            <Outlet context={ctx} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
