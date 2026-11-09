import type { ConfigStatus } from "@/lib/supabase";

export default function ConfigError({ status }: { status: ConfigStatus }) {
  return (
    <main className="page">
      {status === "badUrl" ? (
        <>
          <h2 className="page-title">Неверный адрес базы</h2>
          <p className="sub">
            Неверный адрес базы в .env.local, он должен начинаться с https:// (для локальной базы
            допустим http://localhost). Исправь NEXT_PUBLIC_SUPABASE_URL и перезапусти сервер.
          </p>
        </>
      ) : (
        <>
          <h2 className="page-title">Нет подключения к базе</h2>
          <p className="sub">
            Не заданы переменные окружения. Создай файл .env.local в корне проекта по образцу
            .env.example, заполни NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY и
            перезапусти сервер.
          </p>
        </>
      )}
    </main>
  );
}
