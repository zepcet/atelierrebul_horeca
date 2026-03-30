import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type LeadSelectionDeleteToolbarProps = {
  selectedCount: number;
  onClearSelection: () => void;
  onRemoveFromDashboard: (ids: string[]) => Promise<void>;
  selectedIds: string[];
};

/**
 * Rendered with createPortal to document.body so parent overflow / transforms
 * cannot clip or trap the bar. Shows when at least one row is selected.
 */
export function LeadSelectionDeleteToolbar({
  selectedCount,
  onClearSelection,
  onRemoveFromDashboard,
  selectedIds,
}: LeadSelectionDeleteToolbarProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (selectedCount === 0 || !mounted) return null;

  const handleConfirm = async () => {
    setPending(true);
    try {
      await onRemoveFromDashboard(selectedIds);
      onClearSelection();
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  const bar = (
    <div
      className="fixed inset-x-0 bottom-0 z-[200] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none sm:inset-x-auto sm:right-4 sm:bottom-4 sm:left-auto sm:justify-end"
      role="toolbar"
      aria-label="Selected leads actions"
    >
      <div className="pointer-events-auto flex w-full max-w-lg flex-col gap-2 rounded-lg border border-destructive/30 bg-card px-3 py-2.5 shadow-lg backdrop-blur-md sm:max-w-xl">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs font-semibold text-foreground">
            {selectedCount} selected
          </span>
          <span className="text-[11px] text-muted-foreground">
            Dashboard only — Google Sheets unchanged.
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onClearSelection}>
            Clear selection
          </Button>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" size="sm" className="h-8 gap-1.5 text-xs font-semibold">
                <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                Remove from dashboard
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="z-[300]">
              <AlertDialogHeader>
                <AlertDialogTitle>Remove from dashboard?</AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedCount === 1
                    ? "This lead will disappear from all dashboard views and Lead Hub. The row stays in Google Sheets."
                    : `${selectedCount} leads will disappear from all dashboard views and Lead Hub. Rows stay in Google Sheets.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={pending}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleConfirm();
                  }}
                >
                  {pending ? "Removing…" : "Remove"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
