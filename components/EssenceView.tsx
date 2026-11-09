"use client";

import { useEssence } from "@/hooks/useEssence";
import { useName } from "@/hooks/useName";
import EssenceBlockCard from "@/components/EssenceBlockCard";
import { ErrorMessage, Loading } from "@/components/StateMessage";

export default function EssenceView() {
  const { name } = useName();
  const { blocks, loading, error, saveBody } = useEssence(name);

  return (
    <main className="page">
      <h2 className="page-title">Суть идеи</h2>
      <p className="sub">Блоки можно править прямо на странице, изменения видны всей команде.</p>
      {loading && <Loading />}
      {error && <ErrorMessage text={error} />}
      {!loading && !error && blocks.length === 0 && (
        <p className="sub">Здесь пока пусто.</p>
      )}
      <div className="essence">
        {blocks.map((b) => (
          <EssenceBlockCard key={b.id} block={b} onSave={saveBody} />
        ))}
      </div>
    </main>
  );
}
