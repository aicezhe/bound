"use client";

import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useName } from "@/hooks/useName";
import { COLUMNS } from "@/lib/labels";
import type { TaskStatus } from "@/types/db";
import TaskColumn from "@/components/TaskColumn";
import { ErrorMessage, Loading } from "@/components/StateMessage";

export default function TasksView() {
  const { name } = useName();
  const { columns, loading, error, addTask, moveTask, updateTask, removeTask } = useTasks(name);
  const [dragId, setDragId] = useState<string | null>(null);

  function shift(id: string, from: TaskStatus, dir: -1 | 1) {
    const i = COLUMNS.findIndex((c) => c.value === from) + dir;
    if (i < 0 || i >= COLUMNS.length) return;
    const target = COLUMNS[i].value;
    void moveTask(id, target, columns[target].length); // стрелки кладут в конец колонки
  }

  return (
    <main className="page">
      <h2 className="page-title">Задания</h2>
      <p className="sub">Перетаскивай карточки между колонками или двигай стрелками.</p>
      {loading && <Loading />}
      {error && <ErrorMessage text={error} />}
      {!loading && !error && (
        <div className="board">
          {COLUMNS.map((c) => (
            <TaskColumn
              key={c.value}
              status={c.value}
              label={c.label}
              tasks={columns[c.value]}
              dragId={dragId}
              onDragChange={setDragId}
              onDrop={(id, index) => void moveTask(id, c.value, index)}
              onAdd={addTask}
              onShift={shift}
              onUpdate={(id, patch) => void updateTask(id, patch)}
              onRemove={(id) => void removeTask(id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
