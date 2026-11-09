"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BoundIcon } from "@/components/BoundIcon";
import { BRAND_NAME, brandFont } from "@/lib/brand";
import { useName } from "@/hooks/useName";

const TABS = [
  { href: "/", label: "Суть" },
  { href: "/ideas", label: "Идеи" },
  { href: "/tasks", label: "Задания" },
];

export default function Header() {
  const pathname = usePathname();
  const { name, openChange } = useName();

  return (
    <header className="header">
      <Link href="/" className="logo" aria-label={BRAND_NAME}>
        <BoundIcon size={28} animated />
        <span className={brandFont.className}>{BRAND_NAME}</span>
      </Link>
      <nav className="tabs" aria-label="Разделы">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={pathname === t.href ? "tab on" : "tab"}
            aria-current={pathname === t.href ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="who">
        {name && <span className="who-name">{name}</span>}
        <button className="ghost" onClick={openChange} aria-label="Сменить имя">
          Сменить имя
        </button>
      </div>
    </header>
  );
}
