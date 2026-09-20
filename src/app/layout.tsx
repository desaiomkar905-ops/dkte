import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicShield AI — From Citizen Complaint to Verified Civic Action",
  description:
    "Agentic AI civic-response platform: complaint intake, AI triage, duplicate intelligence, department routing, worker dispatch, and AI-verified resolution.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
