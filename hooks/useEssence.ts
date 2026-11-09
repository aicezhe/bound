"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { watchTable } from "@/lib/realtime";
import { useToast } from "@/hooks/useToast";
import type { EssenceBlock, EssenceComment, EssenceEntryKind } from "@/types/db";

const byPosition = (a: EssenceBlock, b: EssenceBlock) => a.position - b.position;
const byCreated = (a: EssenceComment, b: EssenceComment) =>
  a.created_at.localeCompare(b.created_at);

export function useEssence(name: string | null) {
  const notify = useToast();
  const [blocks, setBlocks] = useState<EssenceBlock[]>([]);
  const [comments, setComments] = useState<EssenceComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // мнения грузятся отдельно: если их таблицы ещё нет, блоки всё равно работают
  const [commentsError, setCommentsError] = useState(false);

  const load = useCallback(
    () =>
      supabase
        .from("essence_blocks")
        .select("*")
        .order("position")
        .then(({ data, error }) => {
          if (error) setError("Не удалось загрузить блоки. Проверь соединение.");
          else {
            setBlocks(data as EssenceBlock[]);
            setError(null);
          }
          setLoading(false);
        }),
    [],
  );

  const loadComments = useCallback(
    () =>
      supabase
        .from("essence_comments")
        .select("*")
        .order("created_at")
        .then(({ data, error }) => {
          if (error) setCommentsError(true);
          else {
            setComments(data as EssenceComment[]);
            setCommentsError(false);
          }
        }),
    [],
  );

  // сначала select, realtime подключаем после него и только для обновлений
  useEffect(() => {
    let stops: (() => void)[] = [];
    let cancelled = false;
    void Promise.all([load(), loadComments()]).then(() => {
      if (cancelled) return;
      stops = [
        watchTable(
          "essence_blocks",
          (p) => {
            if (p.eventType === "DELETE") {
              const id = (p.old as { id?: string }).id;
              if (id) setBlocks((list) => list.filter((b) => b.id !== id));
              return;
            }
            const row = p.new as EssenceBlock;
            setBlocks((list) =>
              (list.some((b) => b.id === row.id)
                ? list.map((b) => (b.id === row.id ? row : b))
                : [...list, row]
              ).sort(byPosition),
            );
          },
          () => void load(),
        ),
        watchTable(
          "essence_comments",
          (p) => {
            if (p.eventType === "DELETE") {
              const id = (p.old as { id?: string }).id;
              if (id) setComments((list) => list.filter((c) => c.id !== id));
              return;
            }
            const row = p.new as EssenceComment;
            setComments((list) =>
              (list.some((c) => c.id === row.id)
                ? list.map((c) => (c.id === row.id ? row : c))
                : [...list, row]
              ).sort(byCreated),
            );
          },
          () => void loadComments(),
        ),
      ];
    });
    return () => {
      cancelled = true;
      stops.forEach((stop) => stop());
    };
  }, [load, loadComments]);

  const commentsByBlock = useMemo(() => {
    const map: Record<string, EssenceComment[]> = {};
    for (const c of comments) (map[c.block_id] ??= []).push(c);
    return map;
  }, [comments]);

  // true, если сохранено. Вызывающий компонент сам решает, когда вызывать (debounce).
  const saveBody = useCallback(
    async (id: string, body: string): Promise<boolean> => {
      if (!name) {
        notify("Сначала введи имя");
        return false;
      }
      const { error } = await supabase
        .from("essence_blocks")
        .update({ body, updated_by: name })
        .eq("id", id);
      if (error) {
        notify("Не удалось сохранить блок");
        return false;
      }
      return true;
    },
    [name, notify],
  );

  const addBlock = useCallback(
    async (heading: string, body: string): Promise<boolean> => {
      if (!name) {
        notify("Сначала введи имя");
        return false;
      }
      const now = new Date().toISOString();
      const row: EssenceBlock = {
        id: crypto.randomUUID(),
        // в конец: позиции блоков идут по возрастанию
        position: blocks.length ? Math.max(...blocks.map((b) => b.position)) + 1 : 1,
        heading,
        body,
        updated_by: name,
        created_by: name,
        created_at: now,
        updated_at: now,
      };
      setBlocks((list) => [...list, row].sort(byPosition));
      const { error } = await supabase.from("essence_blocks").insert({
        id: row.id,
        position: row.position,
        heading,
        body,
        updated_by: name,
        created_by: name,
      });
      if (error) {
        setBlocks((list) => list.filter((b) => b.id !== row.id));
        notify("Не удалось добавить блок");
        return false;
      }
      return true;
    },
    [name, blocks, notify],
  );

  const addComment = useCallback(
    async (blockId: string, kind: EssenceEntryKind, body: string): Promise<boolean> => {
      if (!name) {
        notify("Сначала введи имя");
        return false;
      }
      const row: EssenceComment = {
        id: crypto.randomUUID(),
        block_id: blockId,
        kind,
        body,
        author_name: name,
        created_at: new Date().toISOString(),
      };
      setComments((list) => [...list, row]);
      const { error } = await supabase
        .from("essence_comments")
        .insert({ id: row.id, block_id: blockId, kind, body, author_name: name });
      if (error) {
        setComments((list) => list.filter((c) => c.id !== row.id));
        notify("Не удалось добавить запись");
        return false;
      }
      return true;
    },
    [name, notify],
  );

  return {
    blocks,
    commentsByBlock,
    commentsError,
    loading,
    error,
    saveBody,
    addBlock,
    addComment,
  };
}
