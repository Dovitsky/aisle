"use client";

// Shared UI primitives used across screens.

import Link from "next/link";

export function PageHeader({
  eyebrow, title, subtitle, action,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display text-[30px] sm:text-[34px] lg:text-[40px] mt-1 leading-[1.05] text-balance">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[14px] text-ink-300 mt-2 leading-relaxed max-w-[60ch]">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function EmptyState({
  title, hint, action,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: { label: string; href?: string; onClick?: () => void; primary?: boolean };
}) {
  return (
    <div className="surface rounded-card border hairline shadow-card px-6 py-10 text-center max-w-md mx-auto animate-fade-in-soft">
      <div className="display text-xl text-ink leading-tight">{title}</div>
      {hint && <p className="text-[13px] text-ink-300 mt-2 leading-relaxed">{hint}</p>}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className={`inline-block mt-4 rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
              action.primary ? "cta-sage" : "border hairline bg-white/80 hover:bg-white"
            }`}
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className={`mt-4 rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
              action.primary ? "cta-sage" : "border hairline bg-white/80 hover:bg-white"
            }`}
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 rounded-card bg-ink/5 animate-pulse-soft" />
      ))}
    </div>
  );
}

export function Stat({
  label, value, tone, sub,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "low" | "medium" | "high" | "ink" | "muted";
  sub?: React.ReactNode;
}) {
  return (
    <div className="surface rounded-card border hairline shadow-card px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className={`display text-2xl mt-1 ${
        tone === "high" ? "text-risk-high" :
        tone === "medium" ? "text-risk-medium" :
        tone === "low" ? "text-risk-low" :
        tone === "muted" ? "text-ink-300" : "text-ink"
      }`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-300 mt-0.5">{sub}</div>}
    </div>
  );
}

export function Section({
  eyebrow, title, action, children, className = "",
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface rounded-card border hairline shadow-card p-4 sm:p-5 ${className}`}>
      {(title || eyebrow || action) && (
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
          <div className="min-w-0">
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {title && <h2 className="display text-xl mt-0.5">{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
