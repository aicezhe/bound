"use client";

import { useState, type FormEvent } from "react";
import Select from "@/components/Select";
import type { IdeaTag } from "@/types/db";

interface Props {
  tags: { value: IdeaTag; label: string }[];
  onAddTag?: (label: string) => Promise<IdeaTag | null>;
  onAdd: (title: string, tag: IdeaTag, body: string) => Promise<boolean>;
}

export default function IdeaForm({ tags, onAddTag, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState<IdeaTag>("feature");
  const [body, setBody] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    if (await onAdd(t, tag, body.trim())) {
      setTitle("");
      setBody("");
    }
  }

  return (
    <form className="addbox" onSubmit={submit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        placeholder="Название идеи"
        aria-label="Название идеи"
      />
      <Select
        value={tag}
        options={tags}
        onChange={setTag}
        ariaLabel="Вид идеи"
        onCreate={onAddTag}
        createLabel="Добавить вид"
        createPlaceholder="Новый вид"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        placeholder="В двух словах: что это и зачем"
        aria-label="Описание"
      />
      <div className="row">
        <button className="btn" type="submit" disabled={!title.trim()}>
          Добавить идею
        </button>
      </div>
    </form>
  );
}
