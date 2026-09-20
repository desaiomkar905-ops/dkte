"use client";

import Link from "next/link";
import { statusLabels, severityLabels, categoryLabels } from "@/lib/constants";

export const statusTone: Record<string, string> = {
  RECEIVED: "bg-slate-100 text-slate-700 ring-slate-200",
  ASSIGNED: "bg-sky-50 text-sky-700 ring-sky-200",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  VERIFICATION: "bg-amber-50 text-amber-700 ring-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CLOSED: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  REOPENED: "bg-orange-50 text-orange-700 ring-orange-200",
  ESCALATED: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const severityTone: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600 ring-slate-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-200",
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusTone[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"}`}>
      {statusLabels[status] ?? status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${severityTone[severity] ?? ""}`}>
      {severityLabels[severity] ?? severity}
    </span>
  );
}

export function CategoryTag({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-civic-50 px-2 py-0.5 text-xs font-medium text-civic-700 ring-1 ring-civic-100">
      {categoryLabels[category] ?? category}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span title="Seeded demo record — not a live citizen report" className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
      DEMO
    </span>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function StatCard({ label, value, tone = "text-slate-900" }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</div>
    </Card>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-civic-600 ${className}`} aria-label="Loading" />
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <p className="font-medium text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  );
}

export function LoginPrompt() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <p className="text-slate-600">Please sign in to continue.</p>
      <Link href="/login" className="mt-3 inline-block rounded-lg bg-civic-700 px-4 py-2 text-sm font-semibold text-white hover:bg-civic-900">
        Sign in
      </Link>
    </div>
  );
}
