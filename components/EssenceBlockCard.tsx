"use client";

import { useEffect, useRef, useState } from "react";
import EssenceModal from "@/components/EssenceModal";
import { formatWhen } from "@/lib/labels";
import type { EssenceBlock, EssenceComment, EssenceEntryKind } from "@/types/db";

const DEBOUNCE_MS = 600;

interface Props {
  block: EssenceBlock;
  comments: EssenceComment[];
  commentsEnabled: boolean;
  onSave: (id: string, body: string) => Promise<boolean>;
  onAddComment: (blockId: string, kind: EssenceEntryKind, body: string) => Promise<boolean>;
  onSetMain: (blockId: string, versionId: string | null) => void;
  onDelete: (blockId: string) => Promise<boolean>;
}

function signature(b: EssenceBlock): string {
  const parts: string[] = [];
  if (b.created_by) parts.push(`Автор ${b.created_by}`);
  parts.push(
    b.updated_by ? `правил ${b.updated_by}, ${formatWhen(b.updated_at)}` : "ещё не правили",
  );
  const text = parts.join(" · ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function EssenceBlockCard({
  block,
  comments,
  commentsEnabled,
  onSave,
  onAddComment,
  onSetMain,
  onDelete,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(block.body);
  const [dirty, setDirty] = useState(false);
  const [seenBody, setSeenBody] = useState(block.body);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // чужая правка приходит через realtime; пока я печатаю, свой черновик не затираем
  if (block.body !== seenBody) {
    setSeenBody(block.body);
    if (!dirty) setDraft(block.body);
  }

  async function flush() {
    const text = pending.current;
    if (text === null) return;
    timer.current = null;
    const ok = await onSaveRef.current(block.id, text);
    // если за время запроса текст снова изменился, остаёмся «грязными» до следующего сохранения
    if (ok && pending.current === text) {
      pending.current = null;
      setDirty(false);
    }
  }

  function change(value: string) {
    setDraft(value);
    setDirty(true);
    pending.current = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, DEBOUNCE_MS);
  }

  // уходим со страницы раньше, чем сработал debounce: сохраняем сразу
  useEffect(() => {
    const id = block.id;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current !== null) void onSaveRef.current(id, pending.current);
    };
  }, [block.id]);

  // на странице показываем главную формулировку, если выбрана
  const main = comments.find((c) => c.id === block.main_version_id);
  const shown = main ? main.body : draft;

  return (
    <>
      <button className="block block-card" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="block-head">
          <h3>{block.heading}</h3>
          <span className="block-count">
            {commentsEnabled && comments.length > 0 ? `Записей: ${comments.length}` : ""}
          </span>
        </span>
        <span className="block-preview">{shown}</span>
        <span className="block-meta">{signature(block)}</span>
      </button>
      {open && (
        <EssenceModal
          block={block}
          draft={draft}
          onDraftChange={change}
          entries={comments}
          entriesEnabled={commentsEnabled}
          onAddEntry={(kind, body) => onAddComment(block.id, kind, body)}
          onSetMain={(versionId) => onSetMain(block.id, versionId)}
          onDelete={async () => {
            if (await onDelete(block.id)) setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
