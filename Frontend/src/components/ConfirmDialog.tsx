"use client";

import { AlertTriangle } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-[120] bg-dark/45 backdrop-blur-[2px]" />
        <DialogPrimitive.Content className="dialog-content fixed left-1/2 top-1/2 z-[121] w-[min(calc(100%_-_2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-border bg-white p-6 shadow-2xl focus:outline-none">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-primary"><AlertTriangle className="h-5 w-5" /></div>
          <DialogPrimitive.Title className="text-xl font-bold text-dark">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 leading-relaxed text-gray-text">{description}</DialogPrimitive.Description>
          <div className="mt-6 flex justify-end gap-3">
            <DialogPrimitive.Close asChild><button type="button" className="rounded-xl border border-gray-border px-4 py-2.5 text-sm font-semibold text-dark hover:border-primary">Отмена</button></DialogPrimitive.Close>
            <button type="button" onClick={onConfirm} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">{confirmLabel}</button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
