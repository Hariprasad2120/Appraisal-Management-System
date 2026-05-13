import Link from "next/link";
import { ChevronRight } from "lucide-react";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[0.8rem]">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground/50" />}
            {isLast || !item.href ? (
              <span className={isLast ? "text-foreground font-medium" : "text-muted-foreground"}>
                {item.label}
              </span>
            ) : (
              <Link href={item.href} className="text-muted-foreground hover:text-primary transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
