"use client";

import Link from "next/link";
import { statusLabels, severityLabels, categoryLabels } from "@/lib/constants";

export const statusTone: Record<string, string> = {
  RECEIVED: "bg-slate-500/10 text-slate-300 border-slate-400/25",
  ASSIGNED: "bg-sky-500/10 text-sky-300 border-sky-400/30",
  IN_PROGRESS: "bg-indigo-500/10 text-indigo-300 border-indigo-400/30",
  VERIFICATION: "bg-amber-500/10 text-amber-300 border-amber-400/30",
  RESOLVED: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
  CLOSED: "bg-emerald-500/15 text-emerald-200 border-emerald-400/40",
  REOPENED: "bg-orange-500/10 text-orange-300 border-orange-400/30",
  ESCALATED: "bg-rose-500/10 text-rose-300 border-rose-400/30",
};

export const severityTone: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-300 border-slate-400/25",
  MEDIUM: "bg-amber-500/10 text-amber-300 border-amber-400/30",
  HIGH: "bg-orange-500/10 text-orange-300 border-orange-400/30",
  CRITICAL: "bg-rose-500/15 text-rose-300 border-rose-400/40",
};

const dotColor: Record<string, string> = {
  RECEIVED: "bg-slate-400",
  ASSIGNED: "bg-sky-400",
  IN_PROGRESS: "bg-indigo-400",
  VERIFICATION: "bg-amber-400",
  RESOLVED: "bg-emerald-400",
  CLOSED: "bg-emerald-300",
  REOPENED: "bg-orange-400",
  ESCALATED: "bg-rose-400",
};

export function StatusBadge({ status, pulse = false }: { status: string; pulse?: boolean }) {
  return (
    <span className={`cs-badge ${statusTone[status] ?? "bg-slate-500/10 text-slate-300 border-slate-400/25"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor[status] ?? "bg-slate-400"} ${pulse ? "cs-pulse-dot" : ""}`} aria-hidden />
      {statusLabels[status] ?? status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`cs-badge ${severityTone[severity] ?? ""}`}>
      {severityLabels[severity] ?? severity}
    </span>
  );
}

export function CategoryTag({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-300">
      {categoryLabels[category] ?? category}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span
      title="Seeded demo record — not a live citizen report"
      className="inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-300"
    >
      DEMO
    </span>
  );
}

export function Card({ children, className = "", hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return <div className={`cs-card ${hover ? "cs-card-hover" : ""} ${className}`}>{children}</div>;
}

export function MetricCard({
  label,
  value,
  tone = "text-cs-text",
  hint,
  icon,
}: {
  label: string;
  value: number | string;
  tone?: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="cs-fade-up p-4 sm:p-5" hover>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-cs-muted">{label}</div>
        {icon && <span className="text-cs-muted/70">{icon}</span>}
      </div>
      <div className={`mt-2 text-[28px] font-semibold leading-none tracking-tight ${tone}`}>{value}</div>
      {hint && <div className="mt-1.5 text-xs text-cs-muted">{hint}</div>}
    </Card>
  );
}

/** Backwards-compatible alias used by earlier pages. */
export function StatCard({ label, value, tone = "text-cs-text" }: { label: string; value: number | string; tone?: string }) {
  return <MetricCard label={label} value={value} tone={tone} />;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`cs-skeleton ${className}`} aria-hidden />;
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 rounded-full border-2 border-cs-border border-t-sky-400 ${className}`}
      style={{ animation: "cs-spin 0.8s linear infinite" }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="cs-fade-up mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-cs-text sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-cs-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="cs-fade-up flex items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="cs-btn cs-btn-danger !px-3 !py-1.5 !text-xs">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="cs-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-cs-border bg-cs-surface/50 px-8 py-14 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl border border-cs-border bg-cs-elevated text-lg" aria-hidden>
        🗳️
      </div>
      <p className="font-medium text-cs-text">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-cs-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoginPrompt() {
  return (
    <Card className="p-8 text-center">
      <p className="text-cs-muted">Please sign in to continue.</p>
      <Link href="/login" className="cs-btn cs-btn-primary mt-4">
        Sign in
      </Link>
    </Card>
  );
}
