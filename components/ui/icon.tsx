export function Icon({
  name,
  filled = false,
  size = 20,
  className = "",
}: {
  name: string;
  filled?: boolean;
  /** Tamanho em px. Inline para vencer o CSS não-camadado da fonte do Google. */
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{
        fontSize: size,
        lineHeight: 1,
        ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}),
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
