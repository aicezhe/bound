import { statusLabel } from "@/lib/labels";
import type { IdeaWithVotes } from "@/types/db";

interface Props {
  idea: IdeaWithVotes;
  tagLabel: string;
  voted: boolean;
  onCycleStatus: () => void;
  onVote: () => void;
  onArchive: () => void;
  onToTasks: () => void;
}

export default function IdeaCard({
  idea,
  tagLabel,
  voted,
  onCycleStatus,
  onVote,
  onArchive,
  onToTasks,
}: Props) {
  return (
    <article className="idea">
      <h4>{idea.title}</h4>
      {idea.body && <p>{idea.body}</p>}
      <div className="meta">
        <span className="tag">{tagLabel}</span>
        <span className={`status ${idea.status}`}>{statusLabel(idea.status)}</span>
        <span className="tag">{idea.author_name}</span>
      </div>
      <div className="acts">
        <button
          className={voted ? "ghost voted" : "ghost"}
          onClick={onVote}
          aria-pressed={voted}
          aria-label={voted ? "Снять голос" : "Проголосовать"}
        >
          Голос · {idea.votes}
        </button>
        <button className="ghost" onClick={onCycleStatus} aria-label="Сменить статус">
          Сменить статус
        </button>
        <button className="ghost" onClick={onToTasks} aria-label="В задания">
          В задания
        </button>
        <button className="ghost" onClick={onArchive} aria-label="В архив">
          В архив
        </button>
      </div>
    </article>
  );
}
