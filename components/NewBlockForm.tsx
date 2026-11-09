"use client";

import { useState, type FormEvent } from "react";
import Dialog from "@/components/Dialog";

interface Props {
  onAdd: (heading: string, body: string) => Promise<boolean>;
}

// плитка «+» в сетке блоков; форма открывается в окне поверх затемнённой страницы
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

  return (
    <>
      <button className="block-add" aria-label="Добавить блок" onClick={() => setOpen(true)}>
        + Добавить блок
      </button>
      {open && (
        <Dialog labelledBy="newblock-title" onClose={() => setOpen(false)}>
          <form onSubmit={submit}>
            <h2 id="newblock-title" className="modal-title">
              Новый блок
            </h2>
            <div className="stack">
              <input
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
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setOpen(false)}>
                Отмена
              </button>
              <button className="btn" type="submit" disabled={!heading.trim()}>
                Добавить блок
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
