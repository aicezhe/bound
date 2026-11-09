"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { watchTable } from "@/lib/realtime";
import { useToast } from "@/hooks/useToast";
import type { EssenceBlock } from "@/types/db";

const byPosition = (a: EssenceBlock, b: EssenceBlock) => a.position - b.position;

export function useEssence(name: string | null) {
  const notify = useToast();
  const [blocks, setBlocks] = useState<EssenceBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // сначала select, realtime подключаем после него и только для обновлений
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    void load().then(() => {
      if (cancelled) return;
      stop = watchTable(
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
      );
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [load]);

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

  return { blocks, loading, error, saveBody };
}
