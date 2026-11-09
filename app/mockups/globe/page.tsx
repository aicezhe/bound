import Link from "next/link";
import { BoundIcon } from "@/components/BoundIcon";
import Globe from "@/components/mockups/Globe";
import { BRAND_NAME, brandFont } from "@/lib/brand";

// Макет всегда тёмный, независимо от темы приложения: цвета заданы на .globe-page, а не через prefers-color-scheme
export default function Page() {
  return (
    <div className="globe-page">
      <header className="globe-head">
        <BoundIcon size={26} animated />
        <span className={brandFont.className}>{BRAND_NAME}</span>
        <Link href="/mockups" className="globe-back">
          ← Макеты
        </Link>
      </header>
      <Globe />
    </div>
  );
}
