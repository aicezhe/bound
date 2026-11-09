"use client";

import { useState } from "react";
import { useIdeas } from "@/hooks/useIdeas";
import { useName } from "@/hooks/useName";
import { TAGS } from "@/lib/labels";
import type { IdeaTag } from "@/types/db";
import IdeaCard from "@/components/IdeaCard";
import IdeaForm from "@/components/IdeaForm";
import { ErrorMessage, Loading } from "@/components/StateMessage";

export default function IdeasView() {
  const { name } = useName();
  const { ideas, myVotes, loading, error, addIdea, cycleStatus, archive, toggleVote, sendToTasks } =
    useIdeas(name);
  const [filter, setFilter] = useState<IdeaTag | "all">("all");

  const visible = ideas.filter((i) => filter === "all" || i.tag === filter);

  return (
    <main className="page">
      <h2 className="page-title">Идеи</h2>
      <p className="sub">Новые идеи, гипотезы фич, вопросы. Любую можно отправить в задания.</p>
      <IdeaForm onAdd={addIdea} />
      <div className="filters" role="group" aria-label="Фильтр по тегам">
        {[{ value: "all" as const, label: "Все" }, ...TAGS].map((t) => (
          <button
            key={t.value}
            className={t.value === filter ? "chip on" : "chip"}
            aria-pressed={t.value === filter}
            onClick={() => setFilter(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading && <Loading />}
      {error && <ErrorMessage text={error} />}
      {!loading && !error && visible.length === 0 && (
        <p className="sub">Здесь пока пусто. Добавь первую идею выше.</p>
      )}
      <div className="cards">
        {visible.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            voted={myVotes.has(idea.id)}
            onCycleStatus={() => void cycleStatus(idea)}
            onVote={() => void toggleVote(idea)}
            onArchive={() => void archive(idea)}
            onToTasks={() => void sendToTasks(idea)}
          />
        ))}
      </div>
    </main>
  );
}
