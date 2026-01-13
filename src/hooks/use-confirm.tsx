/**
 * useConfirm Hook
 *
 * Provides a promise-based confirmation dialog
 * Usage:
 *   const confirm = useConfirm();
 *   const confirmed = await confirm({ description: 'Are you sure?' });
 *   if (confirmed) { ... }
 */

'use client';

import { create } from 'zustand';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  handleConfirm: () => void;
  handleCancel: () => void;
}

const useConfirmStore = create<ConfirmState>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: null,

  confirm: (options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      set({
        isOpen: true,
        options,
        resolve,
      });
    });
  },

  handleConfirm: () => {
    const { resolve } = get();
    if (resolve) {
      resolve(true);
    }
    set({ isOpen: false, options: null, resolve: null });
  },

  handleCancel: () => {
    const { resolve } = get();
    if (resolve) {
      resolve(false);
    }
    set({ isOpen: false, options: null, resolve: null });
  },
}));

export function useConfirm() {
  return useConfirmStore((state) => state.confirm);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { isOpen, options, handleConfirm, handleCancel } = useConfirmStore();

  return (
    <>
      {children}
      {options && (
        <ConfirmDialog
          open={isOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleCancel();
            }
          }}
          onConfirm={handleConfirm}
          title={options.title}
          description={options.description}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
        />
      )}
    </>
  );
}
