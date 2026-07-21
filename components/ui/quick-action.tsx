import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="bg-surface-container-low border border-outline-variant p-md rounded-xl flex items-center justify-between group hover:bg-surface-container transition-all cursor-pointer"
    >
      <div className="flex items-center space-x-md">
        <div className="w-12 h-12 bg-surface-container-highest rounded-xl flex items-center justify-center text-on-surface group-hover:bg-primary-container group-hover:text-on-primary-container transition-colors">
          <Icon name={icon} />
        </div>
        <div>
          <h4 className="text-title-sm text-on-surface leading-tight">{title}</h4>
          <p className="text-xs text-on-surface-variant">{description}</p>
        </div>
      </div>
      <Icon name="chevron_right" className="text-on-surface-variant" />
    </Link>
  );
}
