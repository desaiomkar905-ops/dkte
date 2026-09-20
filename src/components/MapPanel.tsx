"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type CivicMapType from "./CivicMap";

const CivicMap = dynamic(() => import("./CivicMap"), {
  ssr: false,
  loading: () => <div className="grid h-full w-full place-items-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-400">Loading map…</div>,
});

export default function MapPanel(props: ComponentProps<typeof CivicMapType>) {
  return <CivicMap {...props} />;
}
