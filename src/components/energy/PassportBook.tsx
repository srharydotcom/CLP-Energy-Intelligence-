import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The whole booklet. Every page inside it has exactly the same size. */
export function PassportBook({ children, label }: { children: ReactNode; label?: string }) {
  return <div className="pp-book" aria-label={label}>{children}</div>;
}

/** Two facing pages. On narrow screens they stack, still at the same size. */
export function PassportSpread({ children }: { children: ReactNode }) {
  return <div className="pp-spread">{children}</div>;
}

/** One fixed-size passport page with a running head and numbered footer. */
export function PassportPage({
  n, title, footer, cover, bodyClassName, children,
}: { n: string; title?: string; footer: string; cover?: boolean; bodyClassName?: string; children: ReactNode }) {
  return (
    <section className={cn("pp-page", cover && "pp-cover")}>
      {title && <div className="pp-head"><span>{n} / {title}</span><span>Energy passport</span></div>}
      <div className={cn("pp-body", bodyClassName)}>{children}</div>
      <div className="pp-foot"><span>{footer}</span><span>{n}</span></div>
    </section>
  );
}
