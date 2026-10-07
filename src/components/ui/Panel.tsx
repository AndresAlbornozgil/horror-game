import type { HTMLAttributes } from "react";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  title?: string;
}

export function Panel({ title, className = "", children, ...props }: PanelProps) {
  return (
    <section className={`paper border border-steel p-6 ${className}`} {...props}>
      {title && (
        <header className="mb-5 flex items-center gap-4">
          <h2 className="label whitespace-nowrap text-parchment">{title}</h2>
          <span className="h-px flex-1 bg-steel" aria-hidden />
        </header>
      )}
      {children}
    </section>
  );
}
