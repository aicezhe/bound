"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { formatWhen } from "@/lib/labels";
import type { EssenceBlock, EssenceComment, EssenceEntryKind } from "@/types/db";

interface Props {
  block: EssenceBlock;
  draft: string;
  onDraftChange: (value: string) => void;
  entries: EssenceComment[];
  entriesEnabled: boolean;
  onAddEntry: (kind: EssenceEntryKind, body: string) => Promise<boolean>;
  onClose: () => void;
}

const KINDS: { value: EssenceEntryKind; label: string; placeholder: string }[] = [
  { value: "comment", label: "Комментарий", placeholder: "Твой комментарий" },
  { value: "version", label: "Следующая версия", placeholder: "Как бы ты написал этот блок" },
];
const kindLabel = (k: EssenceEntryKind | undefined) =>
  KINDS.find((x) => x.value === k)?.label ?? "Комментарий";

const FOCUSABLE = "button:not([disabled]), textarea";

export default function EssenceModal({
  block,
  draft,
  onDraftChange,
  entries,
  entriesEnabled,
  onAddEntry,
  onClose,
}: Props) {
  const [index, setIndex] = useState(0); // 0 = текст блока, дальше записи по порядку
  const [kind, setKind] = useState<EssenceEntryKind>("comment");
  const [text, setText] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const total = entries.length + 1;
  const current = Math.min(index, total - 1);
  const entry = current > 0 ? entries[current - 1] : null;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      // держим фокус внутри окна
      const items = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === dialogRef.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // высота поля по тексту, чтобы читался весь блок без внутренней прокрутки
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const fit = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [draft, current]);

  function go(delta: number) {
    setIndex(Math.min(Math.max(current + delta, 0), total - 1));
  }

  // стрелки листают, пока курсор не в поле ввода
  function onKeyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement).tagName === "TEXTAREA") return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    if (await onAddEntry(kind, body))
      setIndex(entries.length + 1); // переходим к новой записи
    else setText(body);
  }

  const kindInfo = KINDS.find((k) => k.value === kind) ?? KINDS[0];

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="essence-title"
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={onKeyDown}
      >
        <div className="modal-top">
          <h2 id="essence-title" className="block-title">
            {block.heading}
          </h2>
          <button className="ghost" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <div className="pager">
          <button
            className="ghost"
            onClick={() => go(-1)}
            disabled={current === 0}
            aria-label="Назад"
          >
            ←
          </button>
          <span aria-live="polite">
            {entry ? kindLabel(entry.kind) : "Текст блока"} · {current + 1} из {total}
          </span>
          <button
            className="ghost"
            onClick={() => go(1)}
            disabled={current === total - 1}
            aria-label="Дальше"
          >
            →
          </button>
        </div>

        {entry ? (
          <div className="slide">
            <p className="slide-text">{entry.body}</p>
            <p className="block-meta">
              {entry.author_name}, {formatWhen(entry.created_at)}
            </p>
          </div>
        ) : (
          <div className="slide">
            <textarea
              ref={areaRef}
              className="block-text"
              value={draft}
              maxLength={4000}
              rows={1}
              aria-label={block.heading}
              onChange={(e) => onDraftChange(e.target.value)}
            />
            <p className="block-meta">
              {block.created_by ? `Автор ${block.created_by} · ` : ""}
              {block.updated_by
                ? `${block.created_by ? "правил" : "Правил"} ${block.updated_by}, ${formatWhen(block.updated_at)}`
                : "Ещё не правили"}
            </p>
          </div>
        )}

        {entriesEnabled && (
          <form className="entry-form" onSubmit={submit}>
            <div className="kinds" role="group" aria-label="Тип записи">
              {KINDS.map((k) => (
                <button
                  type="button"
                  key={k.value}
                  className={k.value === kind ? "chip on" : "chip"}
                  aria-pressed={k.value === kind}
                  onClick={() => setKind(k.value)}
                >
                  {k.label}
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={4000}
              placeholder={kindInfo.placeholder}
              aria-label={kindInfo.placeholder}
            />
            <div className="modal-actions">
              <button className="btn" type="submit" disabled={!text.trim()}>
                Добавить
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
