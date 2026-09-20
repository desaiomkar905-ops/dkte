import Link from "next/link";
import { aiProviderStatus } from "@/lib/ai";

const PIPELINE = [
  { agent: "VisionAgent", tool: "analyze_image", text: "Photo + GPS + voice/text arrive from the citizen" },
  { agent: "TriageAgent", tool: "classify_issue · calculate_severity · calculate_priority", text: "Structured classification with explainable scoring" },
  { agent: "DuplicateAgent", tool: "find_nearby_complaints · detect_duplicate", text: "Links potentially related complaints — no duplicate cases" },
  { agent: "RoutingAgent", tool: "find_department", text: "Routes to the responsible municipal department" },
  { agent: "DispatchAgent", tool: "create_complaint · notify_citizen", text: "Complaint created, SLA clock starts, citizen notified" },
  { agent: "VerificationAgent", tool: "verify_resolution", text: "AI checks worker's repair evidence before a case closes" },
];

export default function LandingPage() {
  const providers = aiProviderStatus();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-civic-700 text-xs font-bold text-white">CS</span>
            CivicShield <span className="text-civic-700">AI</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/login" className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100">Sign in</Link>
            <Link href="/register" className="rounded-md bg-civic-700 px-3 py-1.5 font-semibold text-white hover:bg-civic-900">Create account</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        {/* Hero */}
        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-civic-700">Agentic AI civic-response platform</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            From Citizen Complaint to <span className="text-civic-700">Verified Civic Action</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Most civic systems stop at collecting complaints. CivicShield AI analyzes the report, decides what actions are
            required, executes them through tools, monitors the case against its SLA — and verifies the final resolution with AI.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="rounded-lg bg-civic-700 px-5 py-2.5 font-semibold text-white hover:bg-civic-900">Open the live demo</Link>
            <Link href="/register" className="rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">Report as citizen</Link>
          </div>
        </section>

        {/* Pipeline */}
        <section className="mt-16">
          <h2 className="text-center text-2xl font-bold text-slate-900">One orchestrated agent pipeline, not a chatbot</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">
            Every decision is made by a named agent executing real tools — and every decision is logged to an Activity panel you can audit.
          </p>
          <ol className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((s, i) => (
              <li key={s.agent} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-civic-50 text-xs font-bold text-civic-700">{i + 1}</span>
                  <span className="font-semibold text-slate-800">{s.agent}</span>
                </div>
                <div className="mt-1 font-mono text-xs text-slate-400">{s.tool}</div>
                <p className="mt-2 text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Roles */}
        <section className="mt-16 grid gap-4 md:grid-cols-3">
          <RoleCard
            title="Citizen"
            points={["Photo + voice + GPS reporting", "Duplicate-aware submissions", "Live status & agent decisions", "Karma for verified reports"]}
          />
          <RoleCard
            title="Official"
            points={["Civic Risk Map & filters", "Priority queue with SLA clocks", "Worker assignment", "Overdue/escalation alerts"]}
          />
          <RoleCard
            title="Field Worker"
            points={["Assigned task list", "Citizen evidence on-site", "Submit resolution photo", "AI verification of the repair"]}
          />
        </section>

        {/* Transparency + demo credentials */}
        <section className="mt-14 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900">Honest AI — always labeled</h3>
            <p className="mt-2 text-sm text-slate-600">
              Production providers (YOLOv8 service, Amazon Bedrock) are used when configured. Otherwise clearly-labeled
              development providers keep the pipeline demonstrable — and every result carries its provider label. Production AI results are never faked.
            </p>
            <ul className="mt-3 space-y-1 font-mono text-xs text-slate-500">
              <li>vision: <span className="text-civic-700">{providers.vision}</span></li>
              <li>llm: <span className="text-civic-700">{providers.llm}</span></li>
              <li>verifier: <span className="text-civic-700">{providers.verifier}</span></li>
            </ul>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-6">
            <h3 className="font-semibold text-violet-900">Demo accounts (seeded demo data)</h3>
            <ul className="mt-2 space-y-1 font-mono text-sm text-violet-900">
              <li>citizen@civicshield.demo / Citizen@123</li>
              <li>worker@civicshield.demo / Worker@123</li>
              <li>official@civicshield.demo / Official@123</li>
            </ul>
            <p className="mt-2 text-xs text-violet-700">
              Seeded records are always marked <strong>DEMO</strong> in the UI. Everything you submit during the demo is real data you created.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        CivicShield AI — an original implementation inspired by civic-AI design patterns. Built with open-source libraries.
      </footer>
    </div>
  );
}

function RoleCard({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
        {points.map((p) => (
          <li key={p} className="flex gap-2"><span className="text-civic-600">✓</span>{p}</li>
        ))}
      </ul>
    </div>
  );
}
