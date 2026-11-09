// Типы и enum строго по reference/bound_schema.sql
export type TaskStatus = "backlog" | "doing" | "check" | "done";
export type IdeaStatus = "new" | "testing" | "accepted" | "rejected";
// после миграции idea_tags это value из таблицы idea_tags (стартовые: feature, product, match, growth, question)
export type IdeaTag = string;

export interface IdeaTagRow {
  value: string;
  label: string;
  position: number;
}
export type Priority = 0 | 1 | 2;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  position: number;
  priority: Priority;
  author_name: string;
  assignee_name: string | null;
  due_date: string | null;
  idea_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface Idea {
  id: string;
  title: string;
  body: string;
  tag: IdeaTag;
  status: IdeaStatus;
  author_name: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// строка представления ideas_with_votes
export interface IdeaWithVotes extends Idea {
  votes: number;
}

export interface IdeaVote {
  idea_id: string;
  voter_name: string;
  created_at: string;
}

export interface EssenceBlock {
  id: string;
  position: number;
  heading: string;
  body: string;
  updated_by: string | null;
  created_by: string | null; // автор блока, null у стартовых блоков
  main_version_id: string | null; // главная формулировка (запись kind = version), null = исходный текст
  created_at: string;
  updated_at: string;
}

export type EssenceEntryKind = "comment" | "version";

// запись обсуждения блока: комментарий или предложенная следующая версия текста
export interface EssenceComment {
  id: string;
  block_id: string;
  kind: EssenceEntryKind;
  body: string;
  author_name: string;
  created_at: string;
}
