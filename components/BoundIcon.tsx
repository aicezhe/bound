import "./BoundIcon.css";

type Props = {
  /** Размер в пикселях */
  size?: number;
  /** false: рябь замирает (для мелких мест, списков, печати) */
  animated?: boolean;
  className?: string;
  title?: string;
};

/**
 * Иконка Bound: рябь от узла.
 * Три кольца расходятся по очереди и тают, в центре узел-импульс.
 * Цвета берутся из CSS-переменных --accent и --pulse (см. BoundIcon.css).
 */
export function BoundIcon({
  size = 28,
  animated = true,
  className,
  title = "Bound",
}: Props) {
  const cls = ["bound-icon", animated ? "bound-icon--animated" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={cls}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <circle className="bound-icon__ring bound-icon__ring--1" cx="32" cy="32" r="29" />
      <circle className="bound-icon__ring bound-icon__ring--2" cx="32" cy="32" r="29" />
      <circle className="bound-icon__ring bound-icon__ring--3" cx="32" cy="32" r="29" />
      <circle className="bound-icon__halo" cx="32" cy="32" r="7" />
      <circle className="bound-icon__node" cx="32" cy="32" r="3.4" />
    </svg>
  );
}
