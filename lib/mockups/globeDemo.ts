// ДЕМО-ДАННЫЕ: названия из схемы зон, числа выдуманы для макета.
// Для реальных данных замени эти константы данными из Supabase (см. docs/ARCHITECTURE.md).
export interface Region {
  name: string;
  people: number;
}

export const REGIONS: Region[] = [
  { name: "B2B и софт", people: 24 },
  { name: "Потребительские", people: 18 },
  { name: "Здоровье", people: 12 },
  { name: "Финтех", people: 15 },
  { name: "Промышленность", people: 9 },
  { name: "Недвижимость", people: 7 },
  { name: "Образование", people: 11 },
];

// [индекс острова, индекс острова, сила связи]
export const LINKS: [number, number, number][] = [
  [0, 1, 4], [0, 3, 5], [0, 6, 3], [1, 2, 2], [1, 3, 3], [2, 6, 4],
  [2, 4, 2], [3, 5, 2], [4, 5, 3], [4, 0, 2], [5, 6, 2], [1, 6, 3],
];
