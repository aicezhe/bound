"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { formatWhen } from "@/lib/labels";
import type { EssenceBlock } from "@/types/db";

const DEBOUNCE_MS = 600;

interface Props {
  block: EssenceBlock;
  onSave: (id: string, body: string) => Promise<boolean>;
}

export default function EssenceBlockCard({ block, onSave }: Props) {
  const [draft, setDraft] = useState(block.body);
  const [dirty, setDirty] = useState(false);
  const [seenBody, setSeenBody] = useState(block.body);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const onSaveRef = useRef(onSave);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // высота по содержимому: с учётом переноса длинных строк, меняется и при смене ширины
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
  }, [draft]);

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

  return (
    <div className="block">
      <h3>{block.heading}</h3>
      <textarea
        ref={areaRef}
        className="block-text"
        value={draft}
        maxLength={4000}
        rows={1}
        aria-label={block.heading}
        onChange={(e) => change(e.target.value)}
      />
      <p className="block-meta">
        {block.updated_by
          ? `Правил ${block.updated_by}, ${formatWhen(block.updated_at)}`
          : "Ещё не правили"}
      </p>
    </div>
  );
}
