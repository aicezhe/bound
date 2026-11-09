"use client";

import { useState } from "react";
import Select from "@/components/Select";
import { PRIORITIES } from "@/lib/labels";
import type { Task } from "@/types/db";
import type { TaskPatch } from "@/hooks/useTasks";

interface Props {
  task: Task;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onShift: (dir: -1 | 1) => void;
  onUpdate: (patch: TaskPatch) => void;
  onRemove: () => void;
}

function formatDue(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

export default function TaskCard({
  task,
  dragging,
  onDragStart,
  onDragEnd,
  onShift,
  onUpdate,
  onRemove,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [assignee, setAssignee] = useState(task.assignee_name ?? "");

  function saveAssignee() {
    const v = assignee.trim() || null;
    if (v !== task.assignee_name) onUpdate({ assignee_name: v });
  }

  const priorityLabel = task.priority === 1 ? null : PRIORITIES[task.priority].label;

  return (
    <div
      className={dragging ? "task drag" : "task"}
      data-task-id={task.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id); // без этого Firefox не начинает перетаскивание
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
    >
      <div className="t">{task.title}</div>
      {(priorityLabel || task.assignee_name || task.due_date) && (
        <div className="task-meta">
          {priorityLabel && (
            <span className={task.priority === 2 ? "prio high" : "prio"}>{priorityLabel}</span>
          )}
          {task.assignee_name && <span>{task.assignee_name}</span>}
          {task.due_date && <span>до {formatDue(task.due_date)}</span>}
        </div>
      )}
      {editing && (
        <div className="task-edit">
          <Select
            value={task.priority}
            options={PRIORITIES}
            onChange={(priority) => onUpdate({ priority })}
            ariaLabel="Приоритет"
          />
          <input
            value={assignee}
            maxLength={50}
            placeholder="Исполнитель"
            aria-label="Исполнитель"
            onChange={(e) => setAssignee(e.target.value)}
            onBlur={saveAssignee}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <input
            type="date"
            value={task.due_date ?? ""}
            aria-label="Срок"
            onChange={(e) => onUpdate({ due_date: e.target.value || null })}
          />
        </div>
      )}
      <div className="row">
        <div>
          <button aria-label="Влево" onClick={() => onShift(-1)}>
            ←
          </button>
          <button aria-label="Вправо" onClick={() => onShift(1)}>
            →
          </button>
          <button
            aria-label={editing ? "Свернуть детали" : "Детали задачи"}
            aria-expanded={editing}
            onClick={() => setEditing((v) => !v)}
          >
            ⋯
          </button>
        </div>
        <button aria-label="Удалить" onClick={onRemove}>
          ✕
        </button>
      </div>
    </div>
  );
}
