import { useOutletContext } from "react-router-dom";
import type { DashboardContext } from "@/hooks/useLeadStore";

export function useDashboard() {
  return useOutletContext<DashboardContext>();
}
