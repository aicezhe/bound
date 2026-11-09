"use client";

import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Dialog from "@/components/Dialog";
import { formatWhen } from "@/lib/labels";
import type { EssenceBlock, EssenceComment, EssenceEntryKind } from "@/types/db";

interface Props {
  block: EssenceBlock;
  draft: string;
  onDraftChange: (value: string) => void;
  entries: EssenceComment[];
  entriesEnabled: boolean;
  onAddEntry: (kind: EssenceEntryKind, body: string) => Promise<boolean>;
  onSetMain: (versionId: string | null) => void;
  onDelete: () => void;
  onClose: () => void;
}

const KINDS: { value: EssenceEntryKind; label: string; placeholder: string }[] = [
  {
    value: "version",
    label: "Новая формулировка",
    placeholder: "Как бы ты сформулировал эту идею",
  },
  { value: "comment", label: "Комментарий", placeholder: "Твой комментарий" },
];

export default function EssenceModal({
  block,
  draft,
  onDraftChange,
  entries,
  entriesEnabled,
  onAddEntry,
  onSetMain,
  onDelete,
  onClose,
}: Props) {
  const mainIndex = Math.max(0, entries.findIndex((e) => e.id === block.main_version_id) + 1);
  // открываемся на главной формулировке; 0 = исходный текст, дальше записи по порядку
  const [index, setIndex] = useState(mainIndex);
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<EssenceEntryKind>("version");
  const [text, setText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const total = entries.length + 1;
  const current = Math.min(index, total - 1);
  const entry = current > 0 ? entries[current - 1] : null;
  const isFormulation = !entry || entry.kind === "version";
  const isMain = entry ? entry.id === block.main_version_id : block.main_version_id === null;

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
    if (await onAddEntry(kind, body)) {
      setIndex(entries.length + 1); // переходим к новой записи
      setAdding(false);
    } else setText(body);
  }

  const kindInfo = KINDS.find((k) => k.value === kind) ?? KINDS[0];
  const label = !entry
    ? "Исходный текст"
    : entry.kind === "version"
      ? "Формулировка"
      : "Комментарий";

  return (
    <Dialog labelledBy="essence-title" onClose={onClose} onKeyDown={onKeyDown}>
      <div className="modal-top">
        <h2 id="essence-title" className="block-title">
          {block.heading}
        </h2>
        <div className="modal-top-actions">
          <button
            className="ghost"
            onClick={() => setConfirmDelete(true)}
            aria-label="Удалить блок"
          >
            Удалить блок
          </button>
          <button className="ghost" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="confirm" role="alertdialog" aria-label="Подтверждение удаления">
          <span>Удалить блок вместе со всеми формулировками и комментариями?</span>
          <button className="ghost danger" onClick={onDelete}>
            Удалить
          </button>
          <button className="ghost" onClick={() => setConfirmDelete(false)}>
            Отмена
          </button>
        </div>
      )}

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
          {label} · {current + 1} из {total}
          {isFormulation && isMain && <span className="main-badge">Главная</span>}
        </span>
        <span className="pager-right">
          <button
            className="ghost"
            onClick={() => go(1)}
            disabled={current === total - 1}
            aria-label="Дальше"
          >
            →
          </button>
          {entriesEnabled && (
            <button
              className="ghost plus"
              onClick={() => setAdding((v) => !v)}
              aria-expanded={adding}
              aria-label="Добавить формулировку или комментарий"
            >
              +
            </button>
          )}
        </span>
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

      {isFormulation && !isMain && (
        <button className="btn-outline" onClick={() => onSetMain(entry ? entry.id : null)}>
          Сделать главной
        </button>
      )}

      {adding && entriesEnabled && (
        <form className="entry-form" onSubmit={submit}>
          <div className="kinds" role="group" aria-label="Что добавить">
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
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4000}
            placeholder={kindInfo.placeholder}
            aria-label={kindInfo.placeholder}
          />
          <div className="modal-actions">
            <button type="button" className="ghost" onClick={() => setAdding(false)}>
              Отмена
            </button>
            <button className="btn" type="submit" disabled={!text.trim()}>
              Добавить
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
