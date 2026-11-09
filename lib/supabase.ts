import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

export type ConfigStatus = "ok" | "missing" | "badUrl";

// http разрешён только для локального адреса (supabase start), остальное должно быть https
function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

export const configStatus: ConfigStatus =
  !url || !key ? "missing" : isValidUrl(url) ? "ok" : "badUrl";

export const isSupabaseConfigured = configStatus === "ok";

// Без корректных переменных клиент не создаётся (createClient бросил бы ошибку в консоль).
// Типизирован как непустой, потому что Providers не рендерит страницы при isSupabaseConfigured === false.
export const supabase = (
  isSupabaseConfigured ? createClient(url as string, key as string) : null
) as SupabaseClient;
