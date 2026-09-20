import { z } from "zod";

/** All enum-like values in one place — SQLite has no native enums. */

export const ROLES = ["CITIZEN", "WORKER", "OFFICIAL"] as const;
export const CATEGORIES = [
  "POTHOLE",
  "GARBAGE",
  "WATERLOGGING",
  "STREETLIGHT",
  "ROAD_DAMAGE",
  "WASTE_OVERFLOW",
  "OTHER",
] as const;
export const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const STATUSES = [
  "RECEIVED",
  "ASSIGNED",
  "IN_PROGRESS",
  "VERIFICATION",
  "RESOLVED",
  "REOPENED",
  "ESCALATED",
  "CLOSED",
] as const;
export const DEPARTMENT_CODES = ["PWD", "SWM", "ELECT", "WATER", "HEALTH", "GEN"] as const;
export const LANGUAGES = ["en", "hi", "mr"] as const;

export const SLA_HOURS: Record<string, number> = {
  CRITICAL: Number(process.env.SLA_HOURS_CRITICAL ?? 12),
  HIGH: Number(process.env.SLA_HOURS_HIGH ?? 24),
  MEDIUM: Number(process.env.SLA_HOURS_MEDIUM ?? 48),
  LOW: Number(process.env.SLA_HOURS_LOW ?? 72),
};

export const categoryLabels: Record<string, string> = {
  POTHOLE: "Pothole",
  GARBAGE: "Garbage",
  WATERLOGGING: "Waterlogging",
  STREETLIGHT: "Damaged Streetlight",
  ROAD_DAMAGE: "Road Damage",
  WASTE_OVERFLOW: "Overflowing Waste",
  OTHER: "Other Civic Issue",
};

export const statusLabels: Record<string, string> = {
  RECEIVED: "Received",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  VERIFICATION: "Verification",
  RESOLVED: "Resolved",
  REOPENED: "Reopened",
  ESCALATED: "Escalated",
  CLOSED: "Closed",
};

export const severityLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

/** Category → department routing table (original mapping for this project). */
export const CATEGORY_DEPARTMENT: Record<string, string> = {
  POTHOLE: "PWD",
  ROAD_DAMAGE: "PWD",
  WATERLOGGING: "WATER",
  GARBAGE: "SWM",
  WASTE_OVERFLOW: "SWM",
  STREETLIGHT: "ELECT",
  OTHER: "GEN",
};

export const complaintInput = z.object({
  description: z.string().trim().min(10, "Describe the issue in at least 10 characters").max(2000),
  category: z.enum(CATEGORIES).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(300).optional(),
  ward: z.string().trim().max(80).optional(),
  language: z.enum(LANGUAGES).default("en"),
  transcript: z.string().max(4000).optional(),
  photoKey: z.string().max(300).optional(),
  source: z.enum(["CITIZEN", "DEMO"]).default("CITIZEN"),
});

export type ComplaintInput = z.infer<typeof complaintInput>;
