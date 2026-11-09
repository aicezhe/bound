"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import type { Task, TaskStatus } from "@/types/db";
import type { TaskPatch } from "@/hooks/useTasks";
import TaskCard from "@/components/TaskCard";

interface Props {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  dragId: string | null;
  onDragChange: (id: string | null) => void;
  onDrop: (id: string, index: number) => void;
  onAdd: (status: TaskStatus, title: string) => Promise<boolean>;
  onShift: (id: string, from: TaskStatus, dir: -1 | 1) => void;
  onUpdate: (id: string, patch: TaskPatch) => void;
  onRemove: (id: string) => void;
}

export default function TaskColumn(p: Props) {
  const colRef = useRef<HTMLDivElement>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [title, setTitle] = useState("");

  // индекс вставки среди карточек колонки без перетаскиваемой: считаем по середине каждой карточки
  function indexAt(clientY: number): number {
    const cards = Array.from(colRef.current?.querySelectorAll<HTMLElement>("[data-task-id]") ?? []);
    let index = 0;
    for (const el of cards) {
      if (el.dataset.taskId === p.dragId) continue;
      const r = el.getBoundingClientRect();
      if (clientY > r.top + r.height / 2) index++;
    }
    return index;
  }

  function onDragOver(e: DragEvent) {
    if (!p.dragId) return;
    e.preventDefault();
    setDropIndex(indexAt(e.clientY));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || p.dragId;
    if (id) p.onDrop(id, indexAt(e.clientY));
    setDropIndex(null);
    p.onDragChange(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTitle("");
    if (!(await p.onAdd(p.status, t))) setTitle(t);
  }

  // линия-подсказка стоит между карточками без учёта перетаскиваемой
  const shown = p.tasks.filter((t) => t.id !== p.dragId);

  return (
    <div
      className={dropIndex !== null ? "col over" : "col"}
      ref={colRef}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropIndex(null);
      }}
      onDrop={onDrop}
    >
      <h3>
        <div>{p.label}</div>
        <span>{p.tasks.length}</span>
      </h3>
      {p.tasks.map((t) => (
        <div key={t.id}>
          {dropIndex !== null && shown[dropIndex]?.id === t.id && <div className="dropline" />}
          <TaskCard
            task={t}
            dragging={p.dragId === t.id}
            onDragStart={() => p.onDragChange(t.id)}
            onDragEnd={() => {
              p.onDragChange(null);
              setDropIndex(null);
            }}
            onShift={(dir) => p.onShift(t.id, t.status, dir)}
            onUpdate={(patch) => p.onUpdate(t.id, patch)}
            onRemove={() => p.onRemove(t.id)}
          />
        </div>
      ))}
      {dropIndex !== null && dropIndex >= shown.length && <div className="dropline" />}
      <form className="colform" onSubmit={submit}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          placeholder="Новая задача"
          aria-label={`Новая задача, колонка «${p.label}»`}
        />
        <button className="btn" type="submit" aria-label="Добавить задачу" disabled={!title.trim()}>
          +
        </button>
      </form>
    </div>
  );
}
