"use client";

import { useState, type FormEvent } from "react";

interface Props {
  onAdd: (heading: string, body: string) => Promise<boolean>;
}

export default function NewBlockForm({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const h = heading.trim();
    if (!h) return;
    if (await onAdd(h, body.trim())) {
      setHeading("");
      setBody("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <div className="newblock">
        <button className="ghost" onClick={() => setOpen(true)} aria-label="Добавить блок">
          + Добавить блок
        </button>
      </div>
    );
  }

  return (
    <form className="addbox newblock-form" onSubmit={submit}>
      <input
        className="wide"
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
        maxLength={120}
        placeholder="Заголовок блока"
        aria-label="Заголовок блока"
        autoFocus
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={4000}
        placeholder="Текст блока"
        aria-label="Текст блока"
      />
      <div className="row">
        <button type="button" className="ghost" onClick={() => setOpen(false)}>
          Отмена
        </button>
        <button className="btn" type="submit" disabled={!heading.trim()}>
          Добавить блок
        </button>
      </div>
    </form>
  );
}
