import Link from "next/link";

const MOCKUPS = [
  {
    href: "/mockups/globe",
    title: "Шар-сфера",
    text: "Главный экран: вращающийся шар, острова-сферы, связи между людьми",
  },
];

export default function Page() {
  return (
    <main className="page">
      <h2 className="page-title">Макеты</h2>
      <p className="sub">Интерактивные макеты экранов. Данные в них демонстрационные.</p>
      <div className="cards">
        {MOCKUPS.map((m) => (
          <Link key={m.href} href={m.href} className="idea mock-link">
            <h4>{m.title}</h4>
            <p>{m.text}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
