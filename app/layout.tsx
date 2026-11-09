import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import { brandFont } from "@/lib/brand";

export const metadata: Metadata = { title: "Bound" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={brandFont.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
