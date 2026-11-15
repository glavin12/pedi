import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  container,
  name
}: {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
  container: HTMLElement | null;
  name?: string;
}) {
  const previousFocus = useRef<HTMLElement | null>(null);
  // The outer presentation controls remain usable while a tablet dialog is open.
  return <DialogPrimitive.Root modal={false} open={open} onOpenChange={value => {
    if (!value) onClose();
  }}>
    <DialogPrimitive.Portal container={container ?? undefined}>
      <div className="dialog-overlay" aria-hidden="true" />
      <DialogPrimitive.Content className="dialog-content" data-focus={name} onInteractOutside={event => event.preventDefault()} onOpenAutoFocus={event => {
        previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (name === 'patient-dialog') {
          event.preventDefault();
          document.getElementById('patient-id')?.focus();
        }
      }} onCloseAutoFocus={event => {
        event.preventDefault();
        if (container?.querySelector('[role="dialog"][data-state="open"]')) return;
        const previous = previousFocus.current;
        if (previous?.isConnected && !previous.closest('[inert]')) previous.focus({ preventScroll: true });
        else container?.closest('.tablet-app')?.querySelector<HTMLElement>('[data-page-heading]')?.focus({ preventScroll: true });
      }}>
        <div className="dialog-heading"><div><span className="eyebrow">PEDIRESCUE WORKSPACE</span><DialogPrimitive.Title>{title}</DialogPrimitive.Title></div><DialogPrimitive.Close className="close-button" aria-label="Close dialog"><X size={18} /></DialogPrimitive.Close></div>
        <DialogPrimitive.Description className="dialog-description">{description}</DialogPrimitive.Description>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}
