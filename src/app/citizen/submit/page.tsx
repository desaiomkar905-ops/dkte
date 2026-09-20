"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, ErrorNote, Spinner } from "@/components/ui";
import { api, fetchMe } from "@/lib/client";
import { useLang } from "@/lib/i18n";
import { CATEGORIES, categoryLabels } from "@/lib/constants";
import { useRouter } from "next/navigation";

/* ── Minimal Web Speech API types (not in TS DOM lib) ─────────────────── */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};
function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const SPEECH_LOCALES: Record<string, string> = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };

type SubmitResult = {
  complaint: { complaintId: string; refCode: string; category: string; severity: string; priority: number; departmentCode: string; duplicateOfRef?: string; agentRunId: string };
};

export default function SubmitPage() {
  const { t } = useLang();
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);
  const [listening, setListening] = useState(false);
  const [recAvailable, setRecAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SubmitResult["complaint"] | null>(null);
  const [devVision, setDevVision] = useState(false);
  const [demoHint, setDemoHint] = useState("");
  const [activities, setActivities] = useState<Array<{ id: string; agent: string; action: string; summary: string; createdAt: string }>>([]);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u) { router.push("/login"); return; }
      if (u.role !== "CITIZEN" && u.role !== "OFFICIAL") { router.push(u.role === "WORKER" ? "/worker" : "/official"); return; }
    });
    fetch("/api/health/ai").then((r) => r.json()).then((d) => setDevVision(/^dev/i.test(String(d.providers?.vision)))).catch(() => {});
    const t = setTimeout(() => setRecAvailable(Boolean(getRecognition())), 0);
    return () => clearTimeout(t);
  }, [router]);

  function onPhoto(f: File | null) {
    setPhoto(f);
    setPhotoPreview(f ? URL.createObjectURL(f) : null);
  }

  function locate() {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      () => {
        setError("Could not get your location. You can still submit (demo center will be used).");
        setLat(16.6952);
        setLng(74.4574);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = SPEECH_LOCALES[language] ?? "en-IN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript + " ";
      setDescription(text.trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!description.trim() || description.trim().length < 10) {
      setError("Please describe the issue in at least 10 characters (or use voice input).");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("description", description);
      fd.set("language", language);
      fd.set("lat", String(lat ?? 16.6952));
      fd.set("lng", String(lng ?? 74.4574));
      if (address) fd.set("address", address);
      if (photo) fd.set("photo", photo);
      if (devVision && demoHint) fd.set("demoHint", demoHint);

      const res = await api<SubmitResult>("/api/complaints", { formData: fd });
      setResult(res.complaint);
      // Reveal the persisted agent decisions for this run.
      const detail = await api<{ complaint: { agentActivities: Array<{ id: string; agent: string; action: string; summary: string; createdAt: string }> } }>(
        `/api/complaints/${res.complaint.complaintId}`
      );
      setActivities(detail.complaint.agentActivities);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 text-emerald-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span className="font-semibold">Complaint created</span>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight">{result.refCode}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">Category</dt><dd className="font-medium">{categoryLabels[result.category] ?? result.category}</dd></div>
              <div><dt className="text-slate-500">Severity</dt><dd className="font-medium">{result.severity}</dd></div>
              <div><dt className="text-slate-500">Priority</dt><dd className="font-medium">{result.priority}/100</dd></div>
              <div><dt className="text-slate-500">Routed to</dt><dd className="font-medium">{result.departmentCode}</dd></div>
            </dl>
            {result.duplicateOfRef && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                Duplicate Agent linked this to potentially related complaint <strong>{result.duplicateOfRef}</strong>.
              </p>
            )}
            <Link href={`/complaints/${result.complaintId}`} className="mt-4 inline-block rounded-lg bg-civic-700 px-4 py-2 text-sm font-semibold text-white hover:bg-civic-900">
              Track this complaint →
            </Link>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-800">{t("agentActivity")}</h3>
            <ol className="mt-3 space-y-2">
              {activities.map((a, i) => (
                <li key={a.id} className="flex items-start gap-2 text-sm" style={{ animation: `cs-fade 400ms ${i * 120}ms both` }}>
                  <span className="mt-0.5 rounded bg-civic-50 px-1.5 py-0.5 text-xs font-semibold text-civic-700 ring-1 ring-civic-100">{a.agent}</span>
                  <span className="flex-1 text-slate-700">{a.summary}</span>
                </li>
              ))}
            </ol>
          </Card>
          <style>{`@keyframes cs-fade { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: none;} }`}</style>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-slate-900">{t("reportIssue")}</h1>
        <p className="mt-1 text-sm text-slate-500">Our agents will analyze, classify, check duplicates, and route your report automatically.</p>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <Card className="space-y-4 p-4">
            {/* Photo */}
            <div>
              <label htmlFor="photo" className="text-sm font-medium text-slate-700">{t("takePhoto")}</label>
              <input id="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"
                onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-civic-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-civic-700" />
              {photoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Selected issue preview" className="mt-2 max-h-52 rounded-lg border border-slate-200 object-cover" />
              )}
            </div>

            {/* Voice */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1">
                <label htmlFor="language" className="text-sm font-medium text-slate-700">{t("language")}</label>
                <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
              </div>
              <button type="button" onClick={toggleVoice} disabled={!recAvailable}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${listening ? "bg-rose-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"} disabled:opacity-40`}>
                {listening ? `■ ${t("stop")}` : `🎙 ${t("recordVoice")}`}
              </button>
            </div>
            {listening && <p className="flex items-center gap-2 text-sm text-rose-600"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" /> {t("listening")}</p>}
            {!recAvailable && <p className="text-xs text-slate-400">Voice input needs a Chromium-based browser; you can still type the complaint.</p>}

            {/* Description */}
            <div>
              <label htmlFor="description" className="text-sm font-medium text-slate-700">{t("describe")}</label>
              <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Deep pothole near the bus stand, two-wheelers skid every evening…"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" maxLength={2000} />
            </div>

            {/* Dev-provider vision hint (only when the real YOLO service is not configured) */}
            {devVision && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <label htmlFor="demoHint" className="text-sm font-medium text-amber-800">Simulated vision — development provider active</label>
                <p className="text-xs text-amber-700">The YOLO service is not configured. Optionally pick what a vision model would detect; this is clearly labeled in the agent log.</p>
                <select id="demoHint" value={demoHint} onChange={(e) => setDemoHint(e.target.value)} className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm">
                  <option value="">Let the pipeline use text only</option>
                  {CATEGORIES.filter((c) => c !== "OTHER").map((c) => (
                    <option key={c} value={categoryLabels[c]}>{categoryLabels[c]}</option>
                  ))}
                </select>
              </div>
            )}
          </Card>

          {/* Location */}
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={locate} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
                {locating ? "Locating…" : `📍 ${t("useLocation")}`}
              </button>
              {lat != null && lng != null && <span className="font-mono text-xs text-slate-500">{lat}, {lng}</span>}
            </div>
            <div>
              <label htmlFor="address" className="text-sm font-medium text-slate-700">Landmark / address (optional)</label>
              <input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Near bus stand, Ward 2" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>
          </Card>

          {error && <ErrorNote message={error} />}

          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-civic-700 py-3 font-semibold text-white hover:bg-civic-900 disabled:opacity-50">
            {busy ? (<><Spinner className="border-white/40 border-t-white" /> Agents are working…</>) : t("submit")}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
