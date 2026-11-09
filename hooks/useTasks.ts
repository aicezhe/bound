"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { watchTable } from "@/lib/realtime";
import { calcPosition } from "@/lib/position";
import { COLUMNS } from "@/lib/labels";
import { useToast } from "@/hooks/useToast";
import type { Task, TaskStatus } from "@/types/db";

export type TaskPatch = Partial<Pick<Task, "priority" | "assignee_name" | "due_date">>;

const byPosition = (a: Task, b: Task) => a.position - b.position;

export function useTasks(name: string | null) {
  const notify = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // свежий список для колбэков: оптимистичные операции читают его, не пересоздаваясь на каждое изменение
  const tasksRef = useRef<Task[]>(tasks);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const load = useCallback(
    () =>
      supabase
        .from("tasks")
        .select("*")
        .order("position")
        .then(({ data, error }) => {
          if (error) setError("Не удалось загрузить задания. Проверь соединение.");
          else {
            setTasks(data as Task[]);
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
        "tasks",
        (p) => {
          if (p.eventType === "DELETE") {
            const id = (p.old as { id?: string }).id;
            if (id) setTasks((list) => list.filter((t) => t.id !== id));
            return;
          }
          const row = p.new as Task;
          // для своих оптимистичных вставок строка уже есть: заменяем её серверной версией
          setTasks((list) =>
            list.some((t) => t.id === row.id)
              ? list.map((t) => (t.id === row.id ? row : t))
              : [...list, row],
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

  const columns = useMemo(() => {
    const result = {} as Record<TaskStatus, Task[]>;
    for (const c of COLUMNS) {
      result[c.value] = tasks.filter((t) => t.status === c.value).sort(byPosition);
    }
    return result;
  }, [tasks]);

  const addTask = useCallback(
    async (status: TaskStatus, title: string): Promise<boolean> => {
      if (!name) {
        notify("Сначала введи имя");
        return false;
      }
      const col = tasksRef.current.filter((t) => t.status === status).sort(byPosition);
      // в конец колонки; пустая колонка: тот же масштаб, что у значения по умолчанию в базе (секунды)
      const position = col.length ? col[col.length - 1].position + 1 : Date.now() / 1000;
      const now = new Date().toISOString();
      const row: Task = {
        id: crypto.randomUUID(),
        title,
        description: "",
        status,
        position,
        priority: 1,
        author_name: name,
        assignee_name: null,
        due_date: null,
        idea_id: null,
        created_at: now,
        updated_at: now,
        completed_at: status === "done" ? now : null,
      };
      setTasks((list) => [...list, row]);
      const { error } = await supabase
        .from("tasks")
        .insert({ id: row.id, title, status, position, author_name: name });
      if (error) {
        setTasks((list) => list.filter((t) => t.id !== row.id));
        notify("Не удалось добавить задачу");
        return false;
      }
      return true;
    },
    [name, notify],
  );

  // index: место среди карточек целевой колонки без самой перетаскиваемой
  const moveTask = useCallback(
    async (id: string, status: TaskStatus, index: number) => {
      const all = tasksRef.current;
      const task = all.find((t) => t.id === id);
      if (!task) return;
      const sorted = all.filter((t) => t.status === status).sort(byPosition);
      if (task.status === status && sorted.findIndex((t) => t.id === id) === index) return;

      const siblings = sorted.filter((t) => t.id !== id);
      const position = calcPosition(
        siblings.map((t) => t.position),
        index,
      );
      const completed_at =
        status === "done" ? (task.completed_at ?? new Date().toISOString()) : null;
      setTasks((list) =>
        list.map((t) => (t.id === id ? { ...t, status, position, completed_at } : t)),
      );
      const { error } = await supabase.from("tasks").update({ status, position }).eq("id", id);
      if (error) {
        setTasks((list) => list.map((t) => (t.id === id ? task : t)));
        notify("Не удалось переместить карточку");
      }
    },
    [notify],
  );

  const updateTask = useCallback(
    async (id: string, patch: TaskPatch) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;
      setTasks((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) {
        setTasks((list) => list.map((t) => (t.id === id ? task : t)));
        notify("Не удалось сохранить изменения");
      }
    },
    [notify],
  );

  const removeTask = useCallback(
    async (id: string) => {
      const task = tasksRef.current.find((t) => t.id === id);
      if (!task) return;
      setTasks((list) => list.filter((t) => t.id !== id));
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) {
        setTasks((list) => [...list, task]);
        notify("Не удалось удалить карточку");
      }
    },
    [notify],
  );

  return { columns, loading, error, addTask, moveTask, updateTask, removeTask };
}
