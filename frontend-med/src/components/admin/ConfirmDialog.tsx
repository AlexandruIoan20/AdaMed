import { useState, type ReactNode } from "react";
import { Button } from "../ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

// Card de confirmare pentru acțiuni distructive (vezi plan §5.6).
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Șterg definitiv",
  cancelLabel = "Anulează",
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-emerald-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="mt-2 text-sm text-muted-foreground">{description}</div>

        {error && (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" size="lg" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            size="lg"
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Se procesează..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
