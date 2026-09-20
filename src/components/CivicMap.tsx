"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";

export type MapComplaint = {
  id: string;
  refCode: string;
  title: string;
  lat: number;
  lng: number;
  category: string;
  severity: string;
  status: string;
  source: string;
};

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "#64748b",
  MEDIUM: "#f59e0b",
  HIGH: "#f97316",
  CRITICAL: "#e11d48",
};

/** Civic Risk Map — severity-colored markers over OpenStreetMap tiles. */
export default function CivicMap({
  complaints,
  center = [16.6952, 74.4574],
  zoom = 13,
  height = "420px",
}: {
  complaints: MapComplaint[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}) {
  return (
    <div className="relative" style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {complaints.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={c.severity === "CRITICAL" ? 10 : c.severity === "HIGH" ? 8 : 6}
            pathOptions={{
              color: SEVERITY_COLOR[c.severity] ?? "#64748b",
              fillColor: SEVERITY_COLOR[c.severity] ?? "#64748b",
              fillOpacity: 0.55,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-44 space-y-1">
                <div className="font-semibold">{c.refCode}</div>
                <div className="text-sm">{c.title}</div>
                <div className="text-xs text-slate-500">
                  {c.category} · {c.severity} · {c.status} {c.source === "DEMO" && <span className="ml-1 rounded bg-violet-100 px-1 text-violet-700">DEMO</span>}
                </div>
                <Link href={`/complaints/${c.id}`} className="text-xs font-medium text-civic-700 underline">
                  Open case
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="absolute bottom-3 left-3 z-[500] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm">
        <div className="mb-1 font-semibold text-slate-600">Severity</div>
        <div className="flex gap-3">
          {Object.entries(SEVERITY_COLOR).map(([k, color]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
              {k[0] + k.slice(1).toLowerCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
