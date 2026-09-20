/**
 * CivicShield AI seed.
 * Creates departments, demo accounts, and a handful of DEMO complaints
 * (source: "DEMO", always labeled in the UI) so the dashboard/map are not
 * empty during the hackathon demo. Citizen-created data is never faked.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CivicShield AI…");

  const depts = [
    { code: "PWD", name: "Public Works Department", slaNote: "Roads & infrastructure" },
    { code: "SWM", name: "Solid Waste Management", slaNote: "Waste & sanitation" },
    { code: "ELECT", name: "Electricity Department", slaNote: "Streetlights & power" },
    { code: "WATER", name: "Water & Sewerage Department", slaNote: "Drainage & waterlogging" },
    { code: "HEALTH", name: "Public Health Department", slaNote: "Health hazards" },
    { code: "GEN", name: "General Municipal Department", slaNote: "Everything else" },
  ];
  for (const d of depts) {
    await prisma.department.upsert({ where: { code: d.code }, update: {}, create: d });
  }

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const pwd = await prisma.department.findUnique({ where: { code: "PWD" } });
  const swm = await prisma.department.findUnique({ where: { code: "SWM" } });
  const elect = await prisma.department.findUnique({ where: { code: "ELECT" } });

  const official = await prisma.user.upsert({
    where: { email: "official@civicshield.demo" },
    update: {},
    create: {
      email: "official@civicshield.demo", name: "Demo Official", passwordHash: hash("Official@123"),
      role: "OFFICIAL", phone: "9000000001",
    },
  });
  const worker1 = await prisma.user.upsert({
    where: { email: "worker@civicshield.demo" },
    update: {},
    create: {
      email: "worker@civicshield.demo", name: "Demo Worker (Roads)", passwordHash: hash("Worker@123"),
      role: "WORKER", phone: "9000000002", departmentId: pwd?.id,
    },
  });
  const worker2 = await prisma.user.upsert({
    where: { email: "worker2@civicshield.demo" },
    update: {},
    create: {
      email: "worker2@civicshield.demo", name: "Demo Worker (Sanitation)", passwordHash: hash("Worker@123"),
      role: "WORKER", phone: "9000000003", departmentId: swm?.id,
    },
  });
  const citizen = await prisma.user.upsert({
    where: { email: "citizen@civicshield.demo" },
    update: {},
    create: {
      email: "citizen@civicshield.demo", name: "Demo Citizen", passwordHash: hash("Citizen@123"),
      role: "CITIZEN", phone: "9000000004", karma: 20,
    },
  });
  await prisma.user.upsert({
    where: { email: "worker3@civicshield.demo" },
    update: {},
    create: {
      email: "worker3@civicshield.demo", name: "Demo Worker (Electrical)", passwordHash: hash("Worker@123"),
      role: "WORKER", phone: "9000000005", departmentId: elect?.id,
    },
  });

  // A small set of clearly-marked DEMO complaints so the dashboard/map are
  // demonstrable. Every one has source="DEMO" and shows a DEMO badge in UI.
  const demoComplaints = [
    {
      refCode: "CS-2026-000001",
      title: "Deep pothole near market junction",
      description: "Large deep pothole on the main road near the market junction. Two-wheelers are skidding daily; an accident almost happened yesterday.",
      category: "POTHOLE", severity: "HIGH", priority: 88, lat: 16.6952, lng: 74.4574,
      address: "Market Junction, Ichalkaranji", ward: "Ward 5", departmentCode: "PWD",
      status: "IN_PROGRESS", assignedToId: worker1.id,
    },
    {
      refCode: "CS-2026-000002",
      title: "Garbage not collected for a week",
      description: "Household garbage has not been collected for over a week near the school. Foul smell and stray animal issue.",
      category: "GARBAGE", severity: "MEDIUM", priority: 62, lat: 16.6989, lng: 74.4523,
      address: "Near Primary School, Ward 3", ward: "Ward 3", departmentCode: "SWM",
      status: "ASSIGNED", assignedToId: worker2.id,
    },
    {
      refCode: "CS-2026-000003",
      title: "Streetlight not working on main road",
      description: "Streetlight dark for 10 days on the main road stretch. Very unsafe to walk at night.",
      category: "STREETLIGHT", severity: "MEDIUM", priority: 55, lat: 16.6911, lng: 74.4610,
      address: "Main Road, Ward 7", ward: "Ward 7", departmentCode: "ELECT",
      status: "RECEIVED", assignedToId: null,
    },
    {
      refCode: "CS-2026-000004",
      title: "Waterlogging after light rain",
      description: "Waterlogging near the bus stand after only 20 minutes of rain. Drainage seems blocked; water enters shops.",
      category: "WATERLOGGING", severity: "HIGH", priority: 80, lat: 16.7021, lng: 74.4589,
      address: "Bus Stand Road", ward: "Ward 2", departmentCode: "WATER",
      status: "RECEIVED", assignedToId: null,
    },
    {
      refCode: "CS-2026-000005",
      title: "Overflowing public waste bin",
      description: "Public waste bin overflowing for three days, waste spilling onto the footpath near the hospital gate.",
      category: "WASTE_OVERFLOW", severity: "HIGH", priority: 78, lat: 16.6875, lng: 74.4498,
      address: "Hospital Gate Road", ward: "Ward 4", departmentCode: "SWM",
      status: "RECEIVED", assignedToId: null,
    },
    {
      refCode: "CS-2026-000006",
      title: "Pothole cluster near school (RESOLVED example)",
      description: "Cluster of potholes near the school gate. This demo record shows a verified, resolved case.",
      category: "POTHOLE", severity: "MEDIUM", priority: 60, lat: 16.6940, lng: 74.4531,
      address: "School Gate Road", ward: "Ward 5", departmentCode: "PWD",
      status: "RESOLVED", assignedToId: worker1.id, verified: true,
      verificationConfidence: 0.88, verificationReason: "Issue no longer visible in after image (demo record)",
    },
  ];

  for (const c of demoComplaints) {
    const dept = await prisma.department.findUnique({ where: { code: c.departmentCode } });
    const slaDueAt = new Date(Date.now() + (c.severity === "HIGH" ? 24 : 48) * 3600_000);
    await prisma.complaint.upsert({
      where: { refCode: c.refCode },
      update: {},
      create: {
        refCode: c.refCode,
        title: c.title,
        description: c.description,
        category: c.category,
        severity: c.severity,
        priority: c.priority,
        status: c.status,
        source: "DEMO",
        lat: c.lat,
        lng: c.lng,
        address: c.address,
        ward: c.ward,
        departmentId: dept?.id,
        reporterId: citizen.id,
        assignedToId: c.assignedToId ?? null,
        slaHours: c.severity === "HIGH" ? 24 : 48,
        slaDueAt,
        verified: c.verified ?? null,
        verificationConfidence: c.verificationConfidence ?? null,
        verificationReason: c.verificationReason ?? null,
        resolvedAt: c.status === "RESOLVED" ? new Date() : null,
      },
    });
    const existing = await prisma.complaint.findUnique({ where: { refCode: c.refCode } });
    if (existing) {
      const ev = await prisma.timelineEvent.findFirst({ where: { complaintId: existing.id, type: "CREATED" } });
      if (!ev) {
        await prisma.timelineEvent.create({
          data: {
            complaintId: existing.id, type: "CREATED", actor: "demo-seed",
            title: "Complaint received (demo data)",
            detail: `Category ${c.category}, severity ${c.severity}, source DEMO`,
          },
        });
        if (c.assignedToId) {
          await prisma.timelineEvent.create({
            data: { complaintId: existing.id, type: "ASSIGNMENT", actor: "demo-seed", title: "Field worker assigned (demo data)" },
          });
        }
      }
    }
  }

  console.log("Seed complete.");
  console.log("Demo logins (documented in README, clearly marked as demo):");
  console.log("  citizen  citizen@civicshield.demo / Citizen@123");
  console.log("  worker   worker@civicshield.demo  / Worker@123");
  console.log("  official official@civicshield.demo / Official@123");
  console.log(`Users seeded: official=${official.id} worker1=${worker1.id} citizen=${citizen.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
