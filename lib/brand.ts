import { Space_Grotesk } from "next/font/google";

// Шрифт названия меняется здесь: замени импорт и функцию ниже
// (варианты в reference/bound-brand.html: Sora, Unbounded, Syne, Instrument Serif, Fraunces).
export const brandFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-brand",
});

export const BRAND_NAME = "Bound";
