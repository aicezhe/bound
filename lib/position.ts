// siblings: position соседей в целевой колонке БЕЗ перетаскиваемой карточки, по возрастанию.
// index: куда вставляем (0 = в начало, siblings.length = в конец).
export function calcPosition(siblings: number[], index: number): number {
  if (siblings.length === 0) return 0;
  if (index <= 0) return siblings[0] - 1;
  if (index >= siblings.length) return siblings[siblings.length - 1] + 1;
  return (siblings[index - 1] + siblings[index]) / 2;
}
