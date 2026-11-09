import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Change = RealtimePostgresChangesPayload<{ [key: string]: any }>;

let counter = 0;

// Подписка на все события таблицы, только для обновлений: первая загрузка идёт обычным select до неё.
// onSync вызывается при каждом (пере)подключении канала: он догоняет изменения, случившиеся между
// select и подпиской или во время обрыва связи. Ошибки канала на первую загрузку не влияют.
export function watchTable(
  table: string,
  onChange: (change: Change) => void,
  onSync: () => void,
): () => void {
  const channel = supabase
    .channel(`${table}-${++counter}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, onChange)
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onSync();
    });
  return () => {
    void supabase.removeChannel(channel);
  };
}
