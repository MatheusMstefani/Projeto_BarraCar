export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const tones: Record<BadgeTone, string> = {
  success: "bg-green-500/15 text-green-700 dark:text-green-400",
  warning: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  danger: "bg-error-container text-on-error-container dark:text-error",
  info: "bg-primary-container/15 text-primary",
  neutral: "bg-surface-container-highest text-on-surface-variant",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`${tones[tone]} text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap`}>
      {children}
    </span>
  );
}
