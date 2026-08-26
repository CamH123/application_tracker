import { useEffect, useId, useRef, type ReactNode } from "react";

export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (element && !element.open) element.showModal();
    const close = () => onCloseRef.current();
    element?.addEventListener("cancel", close);
    return () => {
      element?.removeEventListener("cancel", close);
      previousFocus?.focus();
    };
  }, []);
  return (
    <dialog ref={dialog} aria-labelledby={titleId} className="dialog-card">
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
