"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { watchTable } from "@/lib/realtime";
import { IDEA_STATUSES, TAGS } from "@/lib/labels";
import { useToast } from "@/hooks/useToast";
import type { IdeaTag, IdeaTagRow, IdeaWithVotes } from "@/types/db";

export function useIdeas(name: string | null) {
  const notify = useToast();
  const [ideas, setIdeas] = useState<IdeaWithVotes[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<{ value: IdeaTag; label: string }[]>(TAGS);
  // если таблицы видов ещё нет, остаётся стартовый набор и создавать новые нельзя
  const [tagsEditable, setTagsEditable] = useState(false);
  const nameRef = useRef(name);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  const loadIdeas = useCallback(
    () =>
      supabase
        .from("ideas_with_votes")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) setError("Не удалось загрузить идеи. Проверь соединение.");
          else {
            setIdeas(data as IdeaWithVotes[]);
            setError(null);
          }
          setLoading(false);
        }),
    [],
  );

  const loadTags = useCallback(
    () =>
      supabase
        .from("idea_tags")
        .select("value,label,position")
        .order("position")
        .then(({ data, error }) => {
          if (error || !data?.length) return;
          setTags((data as IdeaTagRow[]).map((t) => ({ value: t.value, label: t.label })));
          setTagsEditable(true);
        }),
    [],
  );

  const loadMyVotes = useCallback(async () => {
    const me = nameRef.current;
    if (!me) return setMyVotes(new Set());
    const { data } = await supabase.from("idea_votes").select("idea_id").eq("voter_name", me);
    setMyVotes(new Set((data ?? []).map((v) => v.idea_id as string)));
  }, []);

  // голоса зависят от имени: перечитываем при его смене
  useEffect(() => {
    void loadMyVotes();
  }, [name, loadMyVotes]);

  // сначала select, realtime подключаем после него и только для обновлений
  useEffect(() => {
    let stops: (() => void)[] = [];
    let cancelled = false;
    const syncVotes = () => {
      void loadIdeas();
      void loadMyVotes();
    };
    void Promise.all([loadIdeas(), loadTags()]).then(() => {
      if (cancelled) return;
      stops = [
        watchTable(
          "ideas",
          (p) => {
            if (p.eventType === "DELETE") {
              const id = (p.old as { id?: string }).id;
              if (id) setIdeas((list) => list.filter((i) => i.id !== id));
              return;
            }
            const row = p.new as IdeaWithVotes;
            if (row.is_archived) {
              setIdeas((list) => list.filter((i) => i.id !== row.id));
              return;
            }
            // в событии таблицы нет votes: оставляем прежнее число, новую идею считаем с нуля
            setIdeas((list) => {
              const old = list.find((i) => i.id === row.id);
              if (!old) return [{ ...row, votes: 0 }, ...list];
              return list.map((i) => (i.id === row.id ? { ...row, votes: old.votes } : i));
            });
          },
          () => void loadIdeas(),
        ),
        // на представление подписаться нельзя: после событий голосов перечитываем ideas_with_votes
        watchTable("idea_votes", syncVotes, syncVotes),
        watchTable(
          "idea_tags",
          () => void loadTags(),
          () => void loadTags(),
        ),
      ];
    });
    return () => {
      cancelled = true;
      stops.forEach((stop) => stop());
    };
  }, [loadIdeas, loadMyVotes, loadTags]);

  // возвращает value нового (или уже существующего) вида, либо null при ошибке
  const addTag = useCallback(
    async (label: string): Promise<IdeaTag | null> => {
      const clean = label.trim();
      if (!clean) return null;
      const existing = tags.find((t) => t.label.toLowerCase() === clean.toLowerCase());
      if (existing) return existing.value;
      if (!name) {
        notify("Сначала введи имя");
        return null;
      }
      const value = clean.toLowerCase();
      const position = Date.now() / 1000; // в конец списка
      setTags((list) => [...list, { value, label: clean }]);
      const { error } = await supabase
        .from("idea_tags")
        .insert({ value, label: clean, position, created_by: name });
      if (error) {
        setTags((list) => list.filter((t) => t.value !== value));
        notify("Не удалось добавить вид идеи");
        return null;
      }
      return value;
    },
    [name, tags, notify],
  );

  const addIdea = useCallback(
    async (title: string, tag: IdeaTag, body: string): Promise<boolean> => {
      if (!name) {
        notify("Сначала введи имя");
        return false;
      }
      const now = new Date().toISOString();
      const row: IdeaWithVotes = {
        id: crypto.randomUUID(),
        title,
        body,
        tag,
        status: "new",
        author_name: name,
        is_archived: false,
        created_at: now,
        updated_at: now,
        votes: 0,
      };
      setIdeas((list) => [row, ...list]);
      const { error } = await supabase
        .from("ideas")
        .insert({ id: row.id, title, body, tag, author_name: name });
      if (error) {
        setIdeas((list) => list.filter((i) => i.id !== row.id));
        notify("Не удалось добавить идею");
        return false;
      }
      return true;
    },
    [name, notify],
  );

  const cycleStatus = useCallback(
    async (idea: IdeaWithVotes) => {
      const i = IDEA_STATUSES.findIndex((s) => s.value === idea.status);
      const status = IDEA_STATUSES[(i + 1) % IDEA_STATUSES.length].value;
      setIdeas((list) => list.map((x) => (x.id === idea.id ? { ...x, status } : x)));
      const { error } = await supabase.from("ideas").update({ status }).eq("id", idea.id);
      if (error) {
        setIdeas((list) => list.map((x) => (x.id === idea.id ? { ...x, status: idea.status } : x)));
        notify("Не удалось сменить статус");
      }
    },
    [notify],
  );

  const archive = useCallback(
    async (idea: IdeaWithVotes) => {
      setIdeas((list) => list.filter((x) => x.id !== idea.id));
      const { error } = await supabase
        .from("ideas")
        .update({ is_archived: true })
        .eq("id", idea.id);
      if (error) {
        void loadIdeas();
        notify("Не удалось отправить в архив");
      }
    },
    [notify, loadIdeas],
  );

  const toggleVote = useCallback(
    async (idea: IdeaWithVotes) => {
      if (!name) {
        notify("Сначала введи имя");
        return;
      }
      const had = myVotes.has(idea.id);
      const delta = had ? -1 : 1;
      const apply = (d: number, voted: boolean) => {
        setIdeas((list) =>
          list.map((x) => (x.id === idea.id ? { ...x, votes: Math.max(0, x.votes + d) } : x)),
        );
        setMyVotes((s) => {
          const next = new Set(s);
          if (voted) next.add(idea.id);
          else next.delete(idea.id);
          return next;
        });
      };
      apply(delta, !had);
      const query = had
        ? supabase.from("idea_votes").delete().eq("idea_id", idea.id).eq("voter_name", name)
        : supabase.from("idea_votes").insert({ idea_id: idea.id, voter_name: name });
      const { error } = await query;
      if (error) {
        apply(-delta, had);
        notify("Не удалось изменить голос");
      }
    },
    [name, myVotes, notify],
  );

  const sendToTasks = useCallback(
    async (idea: IdeaWithVotes) => {
      if (!name) {
        notify("Сначала введи имя");
        return;
      }
      const { error } = await supabase.from("tasks").insert({
        title: `Проверить идею: ${idea.title}`,
        status: "backlog",
        idea_id: idea.id,
        author_name: name,
      });
      notify(error ? "Не удалось создать задачу" : "Задача добавлена в бэклог");
    },
    [name, notify],
  );

  return {
    tags,
    tagsEditable,
    addTag,
    ideas,
    myVotes,
    loading,
    error,
    addIdea,
    cycleStatus,
    archive,
    toggleVote,
    sendToTasks,
  };
}
