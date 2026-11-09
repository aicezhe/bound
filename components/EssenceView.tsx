"use client";

import { useEssence } from "@/hooks/useEssence";
import { useName } from "@/hooks/useName";
import EssenceBlockCard from "@/components/EssenceBlockCard";
import NewBlockForm from "@/components/NewBlockForm";
import { ErrorMessage, Loading } from "@/components/StateMessage";

export default function EssenceView() {
  const { name } = useName();
  const { blocks, commentsByBlock, commentsError, loading, error, saveBody, addBlock, addComment } =
    useEssence(name);

  return (
    <main className="page">
      <h2 className="page-title">Суть идеи</h2>
      <p className="sub">
        Открой блок, чтобы прочитать целиком, поправить текст, оставить комментарий или предложить
        следующую версию. Новый блок можно добавить внизу.
      </p>
      {loading && <Loading />}
      {error && <ErrorMessage text={error} />}
      {commentsError && <ErrorMessage text="Комментарии и версии сейчас недоступны." />}
      {!loading && !error && blocks.length === 0 && <p className="sub">Здесь пока пусто.</p>}
      <div className="essence">
        {blocks.map((b) => (
          <EssenceBlockCard
            key={b.id}
            block={b}
            comments={commentsByBlock[b.id] ?? []}
            commentsEnabled={!commentsError}
            onSave={saveBody}
            onAddComment={addComment}
          />
        ))}
      </div>
      {!loading && !error && <NewBlockForm onAdd={addBlock} />}
    </main>
  );
}
