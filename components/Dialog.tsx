"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  labelledBy: string;
  onClose: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  children: ReactNode;
}

const FOCUSABLE = "button:not([disabled]), input:not([disabled]), textarea:not([disabled])";

// Окно поверх затемнённой страницы: закрывается по Escape и клику на фон,
// держит фокус внутри и возвращает его туда, откуда окно открыли.
export default function Dialog({ labelledBy, onClose, onKeyDown, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        ref={ref}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
