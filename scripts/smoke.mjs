/**
 * CivicShield AI — end-to-end smoke test.
 * Usage: node scripts/smoke.mjs [baseUrl]
 * Exercises: auth → submit → agent pipeline → detail → official assign →
 * worker start → evidence upload → AI verification → authz/invalid-input checks.
 */
const BASE = process.argv[2] ?? "http://localhost:3100";

let passed = 0;
let failed = 0;
function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name} ${extra}`);
  }
}

const jars = {};
async function call(who, path, opts = {}) {
  const headers = { ...(opts.headers ?? {}) };
  if (jars[who]) headers.cookie = jars[who];
  if (opts.json !== undefined) {
    headers["content-type"] = "application/json";
    opts.body = JSON.stringify(opts.json);
    opts.method = opts.method ?? "POST";
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, redirect: "manual" });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  for (const c of setCookie) {
    const [pair] = c.split(";");
    if (pair.startsWith("cs_session=")) jars[who] = pair;
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function jpegFixture(kind) {
  const fill = kind === "bright" ? 200 : 12;
  const head = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  return new Blob([Buffer.concat([head, Buffer.alloc(80_000, fill), Buffer.from([0xff, 0xd9])])], { type: "image/jpeg" });
}

async function main() {
  console.log(`\nCivicShield AI smoke test → ${BASE}\n`);

  // ── 0. Provider transparency ────────────────────────────────────────────
  console.log("[0] AI provider transparency");
  const health = await call("anon", "/api/health/ai");
  check("GET /api/health/ai is public", health.status === 200);
  check("providers are disclosed", Boolean(health.data?.providers?.vision));

  // ── 1. Auth ─────────────────────────────────────────────────────────────
  console.log("[1] Authentication");
  const bad = await call("anon", "/api/auth/login", { json: { email: "official@civicshield.demo", password: "wrong" } });
  check("wrong password rejected (401)", bad.status === 401);

  const official = await call("official", "/api/auth/login", { json: { email: "official@civicshield.demo", password: "Official@123" } });
  check("official login", official.status === 200 && official.data.user.role === "OFFICIAL");
  const citizen = await call("citizen", "/api/auth/login", { json: { email: "citizen@civicshield.demo", password: "Citizen@123" } });
  check("citizen login", citizen.status === 200 && citizen.data.user.role === "CITIZEN");
  const worker = await call("worker", "/api/auth/login", { json: { email: "worker@civicshield.demo", password: "Worker@123" } });
  check("worker login", worker.status === 200 && worker.data.user.role === "WORKER");

  // ── 2. Citizen submits complaint (photo + demo vision hint) ─────────────
  console.log("[2] Complaint submission → agent pipeline");
  const fd = new FormData();
  fd.set("description", "Deep dangerous pothole on the main road near the bus stand, two-wheelers skid every evening");
  fd.set("lat", "16.6952");
  fd.set("lng", "74.4574");
  fd.set("address", "Smoke test junction");
  fd.set("language", "en");
  fd.set("demoHint", "Pothole");
  fd.set("photo", jpegFixture("dark"), "pothole.jpg");
  const created = await call("citizen", "/api/complaints", { method: "POST", body: fd });
  check("complaint created (201)", created.status === 201, JSON.stringify(created.data));
  const c = created.data?.complaint ?? {};
  check("category = POTHOLE", c.category === "POTHOLE");
  check("severity HIGH/CRITICAL (danger language)", ["HIGH", "CRITICAL"].includes(c.severity), `got ${c.severity}`);
  check("routed to PWD", c.departmentCode === "PWD");
  check("duplicate linked to CS-2026-000001", c.duplicateOfRef === "CS-2026-000001", `got ${c.duplicateOfRef}`);

  const detail = await call("citizen", `/api/complaints/${c.complaintId}`);
  const acts = detail.data?.complaint?.agentActivities ?? [];
  check("detail fetch", detail.status === 200);
  const agents = new Set(acts.map((a) => a.agent));
  check("VisionAgent logged", agents.has("VisionAgent"));
  check("TriageAgent logged", agents.has("TriageAgent"));
  check("DuplicateAgent logged", agents.has("DuplicateAgent"));
  check("RoutingAgent logged", agents.has("RoutingAgent"));
  check("DispatchAgent logged", agents.has("DispatchAgent"));

  // ── 3. Official dashboard data ──────────────────────────────────────────
  console.log("[3] Official dashboard data");
  const list = await call("official", "/api/complaints?scope=all&status=RECEIVED");
  check("official sees complaint list", list.status === 200 && Array.isArray(list.data.complaints));
  const stats = await call("official", "/api/stats");
  check("stats endpoint", stats.status === 200 && typeof stats.data.totals?.total === "number");
  const workers = await call("official", "/api/official/workers");
  check("worker list for assignment", workers.status === 200 && workers.data.users?.length >= 3);
  const roadsWorker = workers.data.users.find((w) => w.name.includes("Roads")) ?? workers.data.users[0];

  // ── 4. Assignment + worker flow ─────────────────────────────────────────
  console.log("[4] Assignment → worker flow");
  const assign = await call("official", `/api/complaints/${c.complaintId}/assign`, { json: { workerId: roadsWorker.id } });
  check("official assigns worker", assign.status === 200 && assign.data.status === "ASSIGNED", JSON.stringify(assign.data));

  const citizenAssign = await call("citizen", `/api/complaints/${c.complaintId}/assign`, { json: { workerId: roadsWorker.id } });
  check("citizen cannot assign (403)", citizenAssign.status === 403);

  const start = await call("worker", `/api/complaints/${c.complaintId}/status`, { json: { action: "start" } });
  check("worker starts work", start.status === 200 && start.data.status === "IN_PROGRESS");

  // ── 5. Resolution evidence → AI verification ────────────────────────────
  console.log("[5] AI resolution verification");
  const vfd = new FormData();
  vfd.set("afterImage", jpegFixture("bright"), "after.jpg");
  vfd.set("note", "Filled and compacted");
  const verify = await call("worker", `/api/complaints/${c.complaintId}/verify`, { method: "POST", body: vfd });
  check("verification ran", verify.status === 200, JSON.stringify(verify.data));
  check("verdict verified=true", verify.data?.verdict?.verified === true);
  check("complaint RESOLVED", verify.data?.status === "RESOLVED");
  check("verdict carries provider label", Boolean(verify.data?.verdict?.provider));

  const after = await call("citizen", `/api/complaints/${c.complaintId}`);
  check("citizen sees verified complaint", after.data?.complaint?.verified === true);
  check("timeline recorded verification", (after.data?.complaint?.events ?? []).some((e) => e.type === "VERIFICATION"));

  // ── 6. Failed verification → REOPENED ───────────────────────────────────
  console.log("[6] Failed verification path");
  const fd2 = new FormData();
  fd2.set("description", "Overflowing waste bin near the hospital gate, smell is unbearable");
  fd2.set("lat", "16.6876");
  fd2.set("lng", "74.4499");
  fd2.set("demoHint", "Overflowing Waste");
  const created2 = await call("citizen", "/api/complaints", { method: "POST", body: fd2 });
  check("second complaint created", created2.status === 201);
  const c2 = created2.data?.complaint ?? {};
  const workers2 = (await call("official", "/api/official/workers")).data.users;
  const anyWorker = workers2.find((w) => w.name.includes("Roads")) ?? workers2[0];
  await call("official", `/api/complaints/${c2.complaintId}/assign`, { json: { workerId: anyWorker.id } });
  await call("worker", `/api/complaints/${c2.complaintId}/status`, { json: { action: "start" } });
  const vfd2 = new FormData();
  vfd2.set("afterImage", jpegFixture("dark"), "still-dark.jpg");
  const verify2 = await call("worker", `/api/complaints/${c2.complaintId}/verify`, { method: "POST", body: vfd2 });
  check("failed verification → not verified", verify2.data?.verdict?.verified === false, JSON.stringify(verify2.data?.verdict));
  check("status REOPENED or ESCALATED (high severity)", ["REOPENED", "ESCALATED"].includes(verify2.data?.status), `got ${verify2.data?.status}`);

  // ── 7. Validation & authz negative tests ────────────────────────────────
  console.log("[7] Validation & authorization");
  const anon = await call("anon", "/api/complaints?scope=all");
  check("unauthenticated list blocked (401)", anon.status === 401);
  const citizenAll = await call("citizen", "/api/complaints?scope=all");
  check("citizen cannot list all (403)", citizenAll.status === 403);
  const badInput = await call("citizen", "/api/complaints", {
    method: "POST",
    body: (() => { const f = new FormData(); f.set("description", "short"); f.set("lat", "200"); f.set("lng", "999"); return f; })(),
  });
  check("invalid input rejected (400)", badInput.status === 400);
  const badFile = await call("citizen", "/api/complaints", {
    method: "POST",
    body: (() => {
      const f = new FormData();
      f.set("description", "Testing file type validation for the smoke test");
      f.set("lat", "16.7"); f.set("lng", "74.45");
      f.set("photo", new Blob([Buffer.alloc(1000, 1)], { type: "application/zip" }), "evil.zip");
      return f;
    })(),
  });
  check("non-image upload rejected (400)", badFile.status === 400);
  const noSecret = await call("anon", "/api/cron/sla");
  check("SLA cron without secret blocked (401)", noSecret.status === 401);

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Smoke test crashed:", e);
  process.exit(1);
});
