"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, Spinner, ErrorNote, StatusBadge, SeverityBadge } from "@/components/ui";
import { api, fetchMe, type SessionUser } from "@/lib/client";

type Detail = {
  id: string; refCode: string; title: string; description: string; category: string; severity: string;
  status: string; address: string | null; photoUrl: string | null;
};

type VerifyResponse = {
  verdict: { verified: boolean; confidence: number; reason: string; provider: string };
  status: string;
};

export default function ResolvePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [me, setMe] = useState<SessionUser | null | undefined>(undefined);
  const [c, setC] = useState<Detail | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u) { setMe(null); return; }
      if (u.role !== "WORKER" && u.role !== "OFFICIAL") { router.push("/citizen"); return; }
      setMe(u);
      api<{ complaint: Detail }>(`/api/complaints/${id}`).then((d) => setC(d.complaint)).catch((e) => setError((e as Error).message));
    });
  }, [id, router]);

  if (me === null) return <AppShell><ErrorNote message="Please sign in as the assigned worker." /></AppShell>;
  if (!c && !error) return <AppShell><div className="grid place-items-center py-20"><Spinner /></div></AppShell>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please attach the after-resolution photo."); return; }
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("afterImage", file);
      if (note) fd.set("note", note);
      const res = await api<VerifyResponse>(`/api/complaints/${id}/verify`, { formData: fd });
      setResult(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-4">
        {result ? (
          <Card className={`p-6 ${result.verdict.verified ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-orange-50"}`}>
            <h1 className={`text-lg font-bold ${result.verdict.verified ? "text-emerald-800" : "text-orange-800"}`}>
              {result.verdict.verified ? "✓ AI verified the resolution" : "↺ AI could not verify — complaint reopened"}
            </h1>
            <p className="mt-2 text-sm text-slate-700">{result.verdict.reason}</p>
            <p className="mt-1 text-xs text-slate-500">
              Confidence {(result.verdict.confidence * 100).toFixed(0)}% · provider {result.verdict.provider} · new status: {result.status}
            </p>
            <div className="mt-4 flex gap-2">
              <Link href={`/complaints/${id}`} className="rounded-lg bg-civic-700 px-4 py-2 text-sm font-semibold text-white hover:bg-civic-900">View case</Link>
              <Link href="/worker" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Back to tasks</Link>
            </div>
          </Card>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900">Submit resolution evidence</h1>
            {c && (
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">{c.refCode}</span>
                  <StatusBadge status={c.status} />
                  <SeverityBadge severity={c.severity} />
                </div>
                <p className="mt-1.5 font-medium text-slate-800">{c.title}</p>
                <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                {c.photoUrl && (
                  <figure className="mt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.photoUrl} alt="Original issue photo" className="max-h-64 rounded-lg border border-slate-200 object-cover" />
                    <figcaption className="mt-1 text-xs text-slate-500">Before — citizen&apos;s original photo</figcaption>
                  </figure>
                )}
              </Card>
            )}

            <form onSubmit={submit} className="space-y-4">
              <Card className="space-y-3 p-4">
                <div>
                  <label htmlFor="after" className="text-sm font-medium text-slate-700">After-resolution photo *</label>
                  <input id="after" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setFile(f);
                      setPreview(f ? URL.createObjectURL(f) : null);
                    }}
                    className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700" />
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="After-resolution preview" className="mt-2 max-h-64 rounded-lg border border-slate-200 object-cover" />
                  )}
                </div>
                <div>
                  <label htmlFor="note" className="text-sm font-medium text-slate-700">Work note (optional)</label>
                  <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Filled with gravel, compacted and levelled"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" maxLength={300} />
                </div>
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  ℹ️ The AI Verification Agent will independently check this photo before the case can close. A claim alone never resolves a complaint.
                </p>
              </Card>
              {error && <ErrorNote message={error} />}
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                {busy ? (<><Spinner className="border-white/40 border-t-white" /> Verifying…</>) : "Submit for AI verification"}
              </button>
            </form>
          </>
        )}
      </div>
    </AppShell>
  );
}
