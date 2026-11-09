"use client";

import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";

interface Option<T> {
  value: T;
  label: string;
}

interface Props<T extends string | number> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  /** если задано, в конце списка появляется пункт «добавить»: создаёт свой вариант и выбирает его */
  onCreate?: (label: string) => Promise<T | null>;
  createLabel?: string;
  createPlaceholder?: string;
}

// Свой список вместо нативного <select>: у системного popup цвет выбранного пункта
// задаёт ОС (синий), в палитру приложения его не покрасить.
export default function Select<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  onCreate,
  createLabel = "Добавить свой",
  createPlaceholder = "Название",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  function close() {
    setOpen(false);
    setCreating(false);
    setDraft("");
  }

  function openList() {
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(i: number) {
    onChange(options[i].value);
    close();
  }

  async function create() {
    const label = draft.trim();
    if (!label || !onCreate) return;
    const created = await onCreate(label);
    if (created === null) return;
    onChange(created);
    close();
    btnRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) choose(active);
      else openList();
    }
  }

  // список закрывается, когда фокус ушёл из всего компонента (кнопка, список, поле нового варианта)
  function onBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
  }

  return (
    <div className="select" onBlur={onBlur}>
      <button
        ref={btnRef}
        type="button"
        className="select-btn"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && !creating ? `${id}-${active}` : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
      >
        <span>{options[selectedIndex]?.label}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      {open && (
        <ul className="select-list" role="listbox" id={`${id}-list`} aria-label={ariaLabel}>
          {options.map((o, i) => (
            <li
              key={String(o.value)}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={[i === active ? "active" : "", i === selectedIndex ? "chosen" : ""].join(
                " ",
              )}
              // mousedown не уводит фокус с кнопки, иначе список закрылся бы до клика
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              {o.label}
            </li>
          ))}
          {onCreate && (
            <li role="presentation" className="select-create">
              {creating ? (
                <input
                  autoFocus
                  value={draft}
                  maxLength={30}
                  placeholder={createPlaceholder}
                  aria-label={createPlaceholder}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void create();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      close();
                      btnRef.current?.focus();
                    }
                  }}
                />
              ) : (
                <button type="button" className="select-add" onClick={() => setCreating(true)}>
                  + {createLabel}
                </button>
              )}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
