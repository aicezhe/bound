import type { IdeaStatus, IdeaTag, Priority, TaskStatus } from "@/types/db";

export const TAGS: { value: IdeaTag; label: string }[] = [
  { value: "feature", label: "Фича" },
  { value: "product", label: "Продукт" },
  { value: "match", label: "Матч" },
  { value: "growth", label: "Рост" },
  { value: "question", label: "Вопрос" },
];

// порядок = круг переключения статуса
export const IDEA_STATUSES: { value: IdeaStatus; label: string }[] = [
  { value: "new", label: "Новая" },
  { value: "testing", label: "Проверяем" },
  { value: "accepted", label: "Принята" },
  { value: "rejected", label: "Отклонена" },
];

export const COLUMNS: { value: TaskStatus; label: string }[] = [
  { value: "backlog", label: "Бэклог" },
  { value: "doing", label: "В работе" },
  { value: "check", label: "Проверка" },
  { value: "done", label: "Готово" },
];

export const PRIORITIES: { value: Priority; label: string }[] = [
  { value: 0, label: "Низкий" },
  { value: 1, label: "Обычный" },
  { value: 2, label: "Высокий" },
];

export const tagLabel = (t: IdeaTag) => TAGS.find((x) => x.value === t)?.label ?? t;
export const statusLabel = (s: IdeaStatus) =>
  IDEA_STATUSES.find((x) => x.value === s)?.label ?? s;

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
