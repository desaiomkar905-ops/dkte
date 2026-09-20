import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "CivicShield AI — From Citizen Complaint to Verified Civic Action",
    template: "%s · CivicShield AI",
  },
  description:
    "Agentic AI civic-response platform: complaint intake, AI triage, duplicate intelligence, department routing, worker dispatch, and AI-verified resolution.",
  openGraph: {
    title: "CivicShield AI",
    description: "Report a problem. Let AI get it to the right team — and verify the fix.",
    type: "website",
    siteName: "CivicShield AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "CivicShield AI",
    description: "From Citizen Complaint to Verified Civic Action.",
  },
};

export const viewport: Viewport = {
  themeColor: "#07111F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans" style={{ fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
