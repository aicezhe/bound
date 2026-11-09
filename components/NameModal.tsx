"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

interface Props {
  initial: string;
  canClose: boolean;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

const FOCUSABLE = "button:not([disabled]), input:not([disabled])";

export default function NameModal({ initial, canClose, onSubmit, onClose }: Props) {
  const [value, setValue] = useState(initial);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    inputRef.current?.select();
    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && canClose) {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // держим фокус внутри окна
      const items = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [canClose, onClose]);

  const trimmed = value.trim();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (trimmed.length >= 1 && trimmed.length <= 50) onSubmit(trimmed);
  }

  return (
    <div className="overlay">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-title"
        ref={dialogRef}
      >
        <form onSubmit={submit}>
          <h2 id="name-title" className="modal-title">
            Как тебя зовут?
          </h2>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={50}
            placeholder="Имя"
            aria-label="Имя"
          />
          <div className="modal-actions">
            {canClose && (
              <button type="button" className="ghost" onClick={onClose}>
                Отмена
              </button>
            )}
            <button type="submit" className="btn" disabled={!trimmed}>
              Продолжить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
