import { Badge, type BadgeTone } from "@/components/ui/badge";

export function MetricCard({
  label,
  value,
  hint,
  badge,
}: {
  label: string;
  value: string;
  hint?: string;
  badge?: { label: string; tone: BadgeTone };
}) {
  return (
    <div className="bg-surface-container-low border border-outline-variant p-md rounded-xl hover:border-primary transition-colors cursor-default">
      <div className="flex justify-between items-start gap-2 mb-sm">
        <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
      </div>
      <div className="text-xl font-bold mb-xs text-on-surface">{value}</div>
      {hint && <div className="text-xs text-on-surface-variant">{hint}</div>}
    </div>
  );
}
