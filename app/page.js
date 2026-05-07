"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Bolt,
  CircleDot,
  Coins,
  Factory,
  Globe2,
  Leaf,
  Radio,
  Sun,
  TrendingUp,
  TrendingDown,
  Wifi,
  Zap,
  MapPin,
} from "lucide-react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";

/* -------------------------------------------------------------------------- */
/*  DATA                                                                      */
/* -------------------------------------------------------------------------- */

const buildHourlyCurve = (pvPeak, dischargePeak, gridBase) =>
  Array.from({ length: 24 }, (_, h) => {
    const sun = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
    const pv = +(pvPeak * sun * 0.95).toFixed(1);
    const peakWindow = h >= 16 && h <= 22 ? 1 : 0;
    const shoulder = h >= 13 && h <= 15 ? 0.4 : 0;
    const bestDischarge = +(dischargePeak * (peakWindow * 0.85 + shoulder)).toFixed(1);
    const baseLoad = gridBase * (0.55 + (h > 8 && h < 20 ? 0.5 : 0.1));
    const gridImport = +Math.max(0, baseLoad - pv * 0.6 - bestDischarge * 0.8).toFixed(1);
    return { hour: `${String(h).padStart(2, "0")}:00`, pv, bestDischarge, grid: gridImport };
  });

const sumFlows = (flows) =>
  flows[0].map((_, i) => ({
    hour: flows[0][i].hour,
    pv: +flows.reduce((s, f) => s + f[i].pv, 0).toFixed(1),
    bestDischarge: +flows.reduce((s, f) => s + f[i].bestDischarge, 0).toFixed(1),
    grid: +flows.reduce((s, f) => s + f[i].grid, 0).toFixed(1),
  }));

const SITES_DATA = [
  { id: "kaohsiung", name: "Kaohsiung Factory A", region: "Industrial · Steel Mill", country: "Taiwan", cc: "TW", lat: 22.6273, lng: 120.3014,
    kpi: { earnings: 4_210_000, vppRevenue: 1_120_400, savings: 612_300, pvGeneration: 2_180_500, co2Avoided: 1_082 },
    soc: 81, bestCapacityMwh: 18.6, currentPowerMw: 3.8, status: "DISCHARGING",
    activeVpp: { status: "DISPATCHING", power: 3.8, command: "Spinning Reserve", eta: "00:21:04" },
    flow: buildHourlyCurve(310, 180, 240),
    alerts: [{ id: 11, level: "warning", site: "Kaohsiung Factory A", msg: "Cell-group voltage delta 32mV approaching threshold", time: "11:54:11" }] },
  { id: "taipei", name: "Taipei HQ Tower", region: "Commercial · Class-A Office", country: "Taiwan", cc: "TW", lat: 25.0330, lng: 121.5654,
    kpi: { earnings: 3_180_500, vppRevenue: 940_200, savings: 488_900, pvGeneration: 1_240_600, co2Avoided: 612 },
    soc: 64, bestCapacityMwh: 12.4, currentPowerMw: 2.1, status: "VPP DISPATCH",
    activeVpp: { status: "DISPATCHING", power: 2.1, command: "Peak Shaving", eta: "00:38:11" },
    flow: buildHourlyCurve(180, 220, 380),
    alerts: [{ id: 21, level: "info", site: "Taipei HQ Tower", msg: "Peak-shaving event begins — target 1.8 MW", time: "12:30:00" }] },
  { id: "taichung", name: "Taichung Logistics", region: "Distribution · Cold Chain", country: "Taiwan", cc: "TW", lat: 24.1477, lng: 120.6736,
    kpi: { earnings: 2_945_800, vppRevenue: 612_400, savings: 401_200, pvGeneration: 1_810_400, co2Avoided: 894 },
    soc: 47, bestCapacityMwh: 9.2, currentPowerMw: -1.6, status: "CHARGING",
    activeVpp: { status: "STANDBY", power: 0, command: "Awaiting dispatch", eta: "—" },
    flow: buildHourlyCurve(260, 140, 310), alerts: [] },
  { id: "tainan", name: "Tainan Solar Farm", region: "Utility-Scale PV", country: "Taiwan", cc: "TW", lat: 22.9999, lng: 120.2270,
    kpi: { earnings: 2_710_300, vppRevenue: 480_100, savings: 90_400, pvGeneration: 4_120_800, co2Avoided: 2_034 },
    soc: 92, bestCapacityMwh: 22.0, currentPowerMw: 0, status: "STANDBY",
    activeVpp: { status: "STANDBY", power: 0, command: "Awaiting dispatch", eta: "—" },
    flow: buildHourlyCurve(540, 90, 60),
    alerts: [{ id: 41, level: "info", site: "Tainan Solar Farm", msg: "PV curtailment lifted — output restored to 4.1 MW", time: "11:20:43" }] },
  { id: "hsinchu", name: "Hsinchu Fab Annex", region: "Semiconductor · Cleanroom", country: "Taiwan", cc: "TW", lat: 24.8138, lng: 120.9675,
    kpi: { earnings: 2_104_700, vppRevenue: 410_500, savings: 388_100, pvGeneration: 980_200, co2Avoided: 481 },
    soc: 55, bestCapacityMwh: 8.4, currentPowerMw: 4.2, status: "DISCHARGING",
    activeVpp: { status: "DISPATCHING", power: 4.2, command: "Demand Response", eta: "00:12:55" },
    flow: buildHourlyCurve(150, 240, 520),
    alerts: [{ id: 51, level: "warning", site: "Hsinchu Fab Annex", msg: "SoC dropping faster than forecast during peak window", time: "12:31:55" }] },
  { id: "taoyuan", name: "Taoyuan DC-2", region: "Hyperscale Data Center", country: "Taiwan", cc: "TW", lat: 25.0098, lng: 121.2952,
    kpi: { earnings: 1_805_000, vppRevenue: 220_400, savings: 312_500, pvGeneration: 620_800, co2Avoided: 305 },
    soc: 38, bestCapacityMwh: 7.2, currentPowerMw: 0, status: "FAULT",
    activeVpp: { status: "STANDBY", power: 0, command: "Module isolated", eta: "—" },
    flow: buildHourlyCurve(120, 80, 410),
    alerts: [{ id: 61, level: "critical", site: "Taoyuan DC-2", msg: "Inverter #3 over-temperature 78°C — module isolated", time: "12:42:08" }] },
  { id: "yokohama", name: "Yokohama Factory", region: "Industrial · Auto Parts", country: "Japan", cc: "JP", lat: 35.4437, lng: 139.6380,
    kpi: { earnings: 6_240_000, vppRevenue: 1_410_000, savings: 805_000, pvGeneration: 3_120_000, co2Avoided: 1_540 },
    soc: 76, bestCapacityMwh: 24.0, currentPowerMw: 5.6, status: "DISCHARGING",
    activeVpp: { status: "DISPATCHING", power: 5.6, command: "TEPCO Frequency Reg.", eta: "00:18:30" },
    flow: buildHourlyCurve(420, 260, 480),
    alerts: [{ id: 71, level: "info", site: "Yokohama Factory", msg: "TEPCO frequency-reg. dispatch accepted — 5.6 MW", time: "12:18:00" }] },
  { id: "osaka", name: "Osaka DC-Hub", region: "Edge Data Center", country: "Japan", cc: "JP", lat: 34.6937, lng: 135.5023,
    kpi: { earnings: 4_870_000, vppRevenue: 985_000, savings: 510_000, pvGeneration: 1_840_000, co2Avoided: 905 },
    soc: 68, bestCapacityMwh: 16.5, currentPowerMw: 2.8, status: "VPP DISPATCH",
    activeVpp: { status: "DISPATCHING", power: 2.8, command: "Peak Shaving", eta: "00:44:12" },
    flow: buildHourlyCurve(280, 200, 430), alerts: [] },
  { id: "rotterdam", name: "Rotterdam Port BESS", region: "Port Electrification", country: "Netherlands", cc: "NL", lat: 51.9244, lng: 4.4777,
    kpi: { earnings: 5_120_000, vppRevenue: 1_680_000, savings: 642_000, pvGeneration: 2_410_000, co2Avoided: 1_180 },
    soc: 88, bestCapacityMwh: 32.0, currentPowerMw: 0, status: "STANDBY",
    activeVpp: { status: "STANDBY", power: 0, command: "Awaiting TenneT signal", eta: "—" },
    flow: buildHourlyCurve(380, 320, 520),
    alerts: [{ id: 91, level: "info", site: "Rotterdam Port BESS", msg: "TenneT aFRR market window opens 14:00 CET", time: "11:00:00" }] },
  { id: "amsterdam", name: "Amsterdam Tower", region: "Mixed-Use · Smart Building", country: "Netherlands", cc: "NL", lat: 52.3676, lng: 4.9041,
    kpi: { earnings: 3_210_000, vppRevenue: 720_000, savings: 388_000, pvGeneration: 1_120_000, co2Avoided: 552 },
    soc: 71, bestCapacityMwh: 11.8, currentPowerMw: -0.9, status: "CHARGING",
    activeVpp: { status: "STANDBY", power: 0, command: "Awaiting dispatch", eta: "—" },
    flow: buildHourlyCurve(220, 160, 380), alerts: [] },
];

const buildGlobalAggregate = () => {
  const sumKpi = SITES_DATA.reduce(
    (acc, s) => ({
      earnings: acc.earnings + s.kpi.earnings,
      vppRevenue: acc.vppRevenue + s.kpi.vppRevenue,
      savings: acc.savings + s.kpi.savings,
      pvGeneration: acc.pvGeneration + s.kpi.pvGeneration,
      co2Avoided: acc.co2Avoided + s.kpi.co2Avoided,
    }),
    { earnings: 0, vppRevenue: 0, savings: 0, pvGeneration: 0, co2Avoided: 0 }
  );
  const totalCapacity = SITES_DATA.reduce((s, x) => s + x.bestCapacityMwh, 0);
  const weightedSoc = Math.round(
    SITES_DATA.reduce((s, x) => s + x.soc * x.bestCapacityMwh, 0) / totalCapacity
  );
  const dispatchingPower = +SITES_DATA.filter((s) => s.activeVpp.status === "DISPATCHING")
    .reduce((sum, s) => sum + s.activeVpp.power, 0)
    .toFixed(1);
  return {
    id: "global",
    name: "Global Aggregate",
    region: `${new Set(SITES_DATA.map((s) => s.country)).size} Countries · ${SITES_DATA.length} Sites`,
    country: "Global",
    cc: "WW",
    kpi: sumKpi,
    soc: weightedSoc,
    bestCapacityMwh: +totalCapacity.toFixed(1),
    activeVpp: {
      status: dispatchingPower > 0 ? "DISPATCHING" : "STANDBY",
      power: dispatchingPower,
      command: "Multi-market aggregator",
      eta: "00:14:22",
    },
    flow: sumFlows(SITES_DATA.map((s) => s.flow)),
    alerts: SITES_DATA.flatMap((s) => s.alerts).slice(0, 6),
  };
};

const GLOBAL = buildGlobalAggregate();

/* -------------------------------------------------------------------------- */
/*  DESIGN TOKENS                                                             */
/* -------------------------------------------------------------------------- */

const fmt = {
  ntd: (n) => `NT$${n.toLocaleString("en-US")}`,
  kwh: (n) => `${n.toLocaleString("en-US")} kWh`,
  compact: (n) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : `${n}`,
  ntdCompact: (n) =>
    n >= 1_000_000 ? `NT$${(n / 1_000_000).toFixed(2)}M` : `NT$${(n / 1_000).toFixed(0)}K`,
};

const STATUS = {
  DISCHARGING:    { label: "Discharging", text: "text-emerald-400", chip: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5", marker: "#34d399", glow: "rgba(52,211,153,0.55)" },
  CHARGING:       { label: "Charging",    text: "text-blue-400",    chip: "border-blue-500/30 text-blue-400 bg-blue-500/5",          marker: "#60a5fa", glow: "rgba(96,165,250,0.55)" },
  "VPP DISPATCH": { label: "VPP",         text: "text-cyan-400",    chip: "border-cyan-500/30 text-cyan-400 bg-cyan-500/5",          marker: "#22d3ee", glow: "rgba(34,211,238,0.65)" },
  STANDBY:        { label: "Standby",     text: "text-slate-400",   chip: "border-white/10 text-slate-400 bg-white/[0.02]",          marker: "#94a3b8", glow: "rgba(148,163,184,0.45)" },
  FAULT:          { label: "Fault",       text: "text-rose-400",    chip: "border-rose-500/30 text-rose-400 bg-rose-500/5",          marker: "#fb7185", glow: "rgba(251,113,133,0.65)" },
};

const ALERT = {
  critical: { dot: "bg-rose-500",   text: "text-rose-300",  ring: "ring-rose-500/30",  icon: AlertTriangle },
  warning:  { dot: "bg-amber-400",  text: "text-amber-200", ring: "ring-amber-500/25", icon: AlertTriangle },
  info:     { dot: "bg-cyan-400",   text: "text-cyan-200",  ring: "ring-cyan-500/25",  icon: Radio },
};

/* shared shells — keeps card chrome consistent */
const card = "rounded-xl border border-white/[0.06] bg-white/[0.015]";
const sectionLabel = "text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500";

/* -------------------------------------------------------------------------- */
/*  HEADER                                                                    */
/* -------------------------------------------------------------------------- */

function Header({ siteId, onSiteChange, clock, site }) {
  return (
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-white/[0.06] bg-black/85 px-6 py-4 backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-400">
          <Bolt className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-white lg:text-lg">
            B.E.S.T. <span className="text-cyan-400">Command Center</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
            Buima Energy Storage Tile · War Room
          </p>
        </div>

        {siteId !== "global" && (
          <div className="ml-3 hidden items-center gap-2 rounded-md border border-cyan-400/20 bg-cyan-500/5 px-2.5 py-1 lg:flex">
            <span className="font-mono text-[10px] text-cyan-400">{site.cc}</span>
            <span className="h-3 w-px bg-cyan-400/30" />
            <span className="text-xs text-white">{site.name}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 font-mono text-xs text-slate-200">
          <CircleDot className="h-3 w-3 animate-pulse text-emerald-400" />
          <span className="hidden text-[10px] text-slate-500 sm:inline">LIVE</span>
          <span>{clock}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.02] px-2 py-1 text-xs">
          <button
            onClick={() => onSiteChange("global")}
            className={`flex items-center gap-1 rounded px-2 py-0.5 transition ${
              siteId === "global" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" /> Global
          </button>
          <span className="h-3 w-px bg-white/10" />
          <select
            value={siteId === "global" ? "" : siteId}
            onChange={(e) => onSiteChange(e.target.value || "global")}
            className="cursor-pointer rounded border border-transparent bg-transparent px-1.5 py-0.5 text-slate-200 outline-none hover:border-white/10 focus:border-cyan-400"
          >
            <option value="" className="bg-black">Specific Site…</option>
            {SITES_DATA.map((s) => (
              <option key={s.id} value={s.id} className="bg-black">
                {s.cc} · {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1.5 text-[11px] font-medium text-emerald-400 lg:flex">
          <Wifi className="h-3.5 w-3.5" /> SCADA · MQTT
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  GLOBAL MAP                                                                */
/* -------------------------------------------------------------------------- */

function PulsingMarker({ status, selected }) {
  const c = STATUS[status] ?? STATUS.STANDBY;
  return (
    <div className="relative -translate-x-1/2 -translate-y-1/2">
      <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full opacity-50" style={{ background: c.marker }} />
      <span
        className={`relative block rounded-full ring-2 ring-white/40 transition-all ${selected ? "h-4 w-4" : "h-3 w-3"}`}
        style={{ background: c.marker, boxShadow: `0 0 12px 1px ${c.glow}` }}
      />
    </div>
  );
}

function SitePopupCard({ site }) {
  const s = STATUS[site.status];
  return (
    <div className="min-w-[230px] p-3.5 font-sans">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-slate-300">{site.cc}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-500">{site.country}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-white">{site.name}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.chip}`}>{s.label}</span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{site.region}</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
        <div className="rounded border border-white/[0.06] bg-black/30 p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">Power</p>
          <p className={`mt-0.5 font-mono text-base ${site.currentPowerMw >= 0 ? "text-emerald-400" : "text-blue-400"}`}>
            {site.currentPowerMw > 0 ? "+" : ""}{site.currentPowerMw.toFixed(1)} MW
          </p>
        </div>
        <div className="rounded border border-white/[0.06] bg-black/30 p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">SoC</p>
          <p className="mt-0.5 font-mono text-base text-cyan-400">{site.soc}%</p>
        </div>
        <div className="rounded border border-white/[0.06] bg-black/30 p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">Capacity</p>
          <p className="mt-0.5 font-mono text-base text-white">{site.bestCapacityMwh} MWh</p>
        </div>
        <div className="rounded border border-white/[0.06] bg-black/30 p-2">
          <p className="text-[9px] uppercase tracking-wider text-slate-500">YTD</p>
          <p className="mt-0.5 font-mono text-base text-emerald-400">{fmt.ntdCompact(site.kpi.earnings)}</p>
        </div>
      </div>
      <p className="mt-2.5 text-center text-[10px] text-cyan-400/70">click marker to drill in →</p>
    </div>
  );
}

function GlobalMap({ sites, selectedId, onSelect }) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [hoverId, setHoverId] = useState(null);
  const hoverSite = useMemo(() => sites.find((s) => s.id === hoverId), [sites, hoverId]);

  if (!token) {
    return (
      <div className="grid h-full place-items-center rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
        <div>
          <p className="text-sm font-medium text-rose-400">NEXT_PUBLIC_MAPBOX_TOKEN not configured</p>
          <p className="mt-1 text-xs text-slate-400">
            Set the env var locally in <code>.env.local</code> and on Vercel → Settings → Environment Variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-white/[0.06] bg-black">
      <Map
        mapboxAccessToken={token}
        initialViewState={{ longitude: 80, latitude: 32, zoom: 1.6 }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        projection="globe"
      >
        <NavigationControl position="top-right" showCompass={false} />
        {sites.map((s) => (
          <Marker key={s.id} longitude={s.lng} latitude={s.lat} anchor="center"
            onClick={(e) => { e.originalEvent.stopPropagation(); onSelect(s.id); }}>
            <div onMouseEnter={() => setHoverId(s.id)} onMouseLeave={() => setHoverId(null)} className="cursor-pointer">
              <PulsingMarker status={s.status} selected={selectedId === s.id} />
            </div>
          </Marker>
        ))}
        {hoverSite && (
          <Popup longitude={hoverSite.lng} latitude={hoverSite.lat} closeButton={false}
            closeOnClick={false} anchor="bottom" offset={18} maxWidth="280px">
            <SitePopupCard site={hoverSite} />
          </Popup>
        )}
      </Map>

      <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2 rounded-md border border-cyan-400/20 bg-black/70 px-2.5 py-1.5 text-[11px] font-medium text-cyan-300 backdrop-blur">
        <MapPin className="h-3 w-3" /> {sites.length} sites · {new Set(sites.map((s) => s.country)).size} countries
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 rounded-md border border-white/[0.08] bg-black/70 px-2.5 py-1.5 text-[10px] tracking-wider text-slate-400 backdrop-blur">
        {Object.entries(STATUS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: v.marker, boxShadow: `0 0 4px ${v.glow}` }} />
            {v.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  TOTALS PANEL — clean, fits 600px                                          */
/* -------------------------------------------------------------------------- */

function TotalsPanel() {
  const t = GLOBAL;
  const dispatchingSites = SITES_DATA.filter((s) => s.activeVpp.status === "DISPATCHING").length;
  const faultSites = SITES_DATA.filter((s) => s.status === "FAULT").length;
  const countryRows = useMemo(() => {
    const map = SITES_DATA.reduce((acc, s) => {
      acc[s.cc] ??= { cc: s.cc, name: s.country, count: 0, earnings: 0 };
      acc[s.cc].count++;
      acc[s.cc].earnings += s.kpi.earnings;
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => b.earnings - a.earnings);
  }, []);

  const gauge = [{ name: "soc", value: t.soc, fill: "#22d3ee" }];

  return (
    <div className={`flex h-full flex-col p-5 ${card}`}>
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <p className={sectionLabel}>Aggregate</p>
          <h2 className="mt-0.5 text-base font-semibold tracking-tight text-white">Global Performance</h2>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
          <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" /> Live
        </span>
      </div>

      {/* Hero earnings */}
      <div className="mt-5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Total Earnings YTD</p>
        <p className="mt-1.5 font-mono text-3xl font-semibold tracking-tight text-white">
          {fmt.ntd(t.kpi.earnings)}
        </p>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
          <TrendingUp className="h-3 w-3" />
          <span>+18.4%</span>
          <span className="text-slate-500">vs. last 30 days</span>
        </div>
      </div>

      <div className="my-5 h-px bg-white/[0.06]" />

      {/* Two stat columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* SoC mini gauge */}
        <div>
          <p className={sectionLabel}>Aggregate SoC</p>
          <div className="relative mt-1 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="68%" outerRadius="100%" data={gauge} startAngle={210} endAngle={-30} barSize={6}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: "rgba(255,255,255,0.05)" }} dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xl font-semibold text-white">{t.soc}<span className="text-xs text-cyan-400">%</span></span>
            </div>
          </div>
          <p className="mt-0.5 text-center text-[11px] text-slate-500">
            <span className="font-mono text-cyan-400">{((t.bestCapacityMwh * t.soc) / 100).toFixed(1)}</span> /{" "}
            {t.bestCapacityMwh.toFixed(1)} MWh
          </p>
        </div>

        {/* Active dispatch */}
        <div>
          <p className={sectionLabel}>Active Dispatch</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-cyan-400">
            +{t.activeVpp.power.toFixed(1)}<span className="ml-1 text-base text-slate-500">MW</span>
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            <span className="font-mono text-slate-300">{dispatchingSites}</span> of {SITES_DATA.length} sites
          </p>
          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
            <div className="h-full rounded-full bg-cyan-400" style={{ width: `${(dispatchingSites / SITES_DATA.length) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="my-5 h-px bg-white/[0.06]" />

      {/* By Country — clean rows */}
      <div>
        <p className={sectionLabel}>By Country</p>
        <div className="mt-2.5 space-y-1">
          {countryRows.map((c) => {
            const pct = (c.earnings / t.kpi.earnings) * 100;
            return (
              <div key={c.cc} className="flex items-center gap-3 py-1">
                <span className="w-7 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-center font-mono text-[10px] text-slate-300">
                  {c.cc}
                </span>
                <span className="text-sm text-slate-200">{c.name}</span>
                <span className="ml-auto font-mono text-xs text-slate-500">{c.count}</span>
                <span className="font-mono text-xs tabular-nums text-cyan-400 w-9 text-right">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer mini stats */}
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-4 text-center">
        <FootStat value={SITES_DATA.length} label="Sites" />
        <FootStat value={dispatchingSites} label="Dispatching" tone="cyan" />
        <FootStat value={faultSites} label="Faults" tone={faultSites > 0 ? "rose" : "muted"} />
      </div>
    </div>
  );
}

function FootStat({ value, label, tone = "muted" }) {
  const tones = {
    muted: "text-slate-300",
    cyan: "text-cyan-400",
    rose: "text-rose-400",
  };
  return (
    <div>
      <p className={`font-mono text-lg font-semibold ${tones[tone]}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  KPI ROW                                                                   */
/* -------------------------------------------------------------------------- */

function KpiCard({ icon: Icon, label, value, sub, accent = "cyan", trend }) {
  const tones = {
    cyan:    "text-cyan-400",
    emerald: "text-emerald-400",
  };
  const trendUp = trend == null ? null : trend >= 0;
  return (
    <div className={`relative overflow-hidden p-5 ${card}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={sectionLabel}>{label}</p>
          <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-white">{value}</p>
          {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
        </div>
        <div className={`grid h-9 w-9 place-items-center rounded-md border border-white/10 bg-white/[0.03] ${tones[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {trend != null && (
        <div className="mt-3 flex items-center gap-1 text-[11px]">
          {trendUp ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-rose-400" />}
          <span className={trendUp ? "text-emerald-400" : "text-rose-400"}>
            {trendUp ? "+" : ""}{trend}%
          </span>
          <span className="text-slate-500">30d</span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  CHARTS                                                                    */
/* -------------------------------------------------------------------------- */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-white/10 bg-black/95 px-2.5 py-2 text-[11px] shadow-xl backdrop-blur">
      <p className="mb-1 font-mono text-slate-500">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}</span>
          <span className="ml-auto font-mono font-medium text-white">{Number(p.value).toFixed(1)} kW</span>
        </div>
      ))}
    </div>
  );
}

function PowerFlowChart({ data }) {
  return (
    <div className={`p-5 ${card}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={sectionLabel}>Daily Power Flow</p>
          <h2 className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold tracking-tight text-white">
            <Activity className="h-3.5 w-3.5 text-cyan-400" /> 24-Hour Telemetry
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <Legend color="#fbbf24" label="PV" />
          <Legend color="#22d3ee" label="BESS Discharge" />
          <Legend color="#fb7185" label="Grid Import" dashed />
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="hour" stroke="#475569" tick={{ fontSize: 10 }} interval={2} />
            <YAxis stroke="#475569" tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(34,211,238,0.05)" }} />
            <Area type="monotone" dataKey="pv" name="PV" stroke="#fbbf24" strokeWidth={1.5} fill="url(#pvFill)" />
            <Bar dataKey="bestDischarge" name="BESS Discharge" fill="#22d3ee" radius={[2, 2, 0, 0]} barSize={8} />
            <Line type="monotone" dataKey="grid" name="Grid Import" stroke="#fb7185" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`block h-2 w-2.5 ${dashed ? "rounded-none" : "rounded-sm"}`} style={{ background: color }} />
      {label}
    </span>
  );
}

function SoCDonut({ soc, capacity }) {
  const data = [{ name: "soc", value: soc, fill: "#22d3ee" }];
  return (
    <div className={`p-5 ${card}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={sectionLabel}>State of Charge</p>
          <h2 className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold tracking-tight text-white">
            <BatteryCharging className="h-3.5 w-3.5 text-cyan-400" /> Storage Level
          </h2>
        </div>
      </div>
      <div className="relative mt-2 h-36">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="74%" outerRadius="100%" data={data} startAngle={220} endAngle={-40} barSize={10}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: "rgba(255,255,255,0.04)" }} dataKey="value" cornerRadius={6} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-semibold tracking-tight text-white">{soc}<span className="text-base text-cyan-400">%</span></span>
          <span className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500">Healthy</span>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
        <MiniStat label="Total" value={`${capacity.toFixed(1)} MWh`} />
        <MiniStat label="Available" value={`${((capacity * soc) / 100).toFixed(1)} MWh`} accent />
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }) {
  return (
    <div className="rounded border border-white/[0.06] bg-white/[0.015] p-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 font-mono text-sm ${accent ? "text-cyan-400" : "text-white"}`}>{value}</p>
    </div>
  );
}

function VppStatus({ vpp }) {
  const dispatching = vpp.status === "DISPATCHING";
  return (
    <div className={`p-5 ${card}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={sectionLabel}>Virtual Power Plant</p>
          <h2 className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold tracking-tight text-white">
            <Radio className="h-3.5 w-3.5 text-cyan-400" /> Dispatch Status
          </h2>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
          dispatching ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400" : "border-white/10 bg-white/[0.02] text-slate-400"
        }`}>
          <span className={`h-1 w-1 rounded-full ${dispatching ? "animate-pulse bg-emerald-400" : "bg-slate-500"}`} />
          {dispatching ? "Active" : "Idle"}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Active Command</p>
          <p className="mt-0.5 font-mono text-sm text-white">{vpp.command}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Power" value={`${vpp.power.toFixed(1)} MW`} accent />
          <MiniStat label="Time Left" value={vpp.eta} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  TABLE & ALERTS                                                            */
/* -------------------------------------------------------------------------- */

function SiteTable({ sites, onSelect, selectedId }) {
  return (
    <div className={card}>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-1.5">
          <Factory className="h-3.5 w-3.5 text-cyan-400" />
          <p className={sectionLabel}>Site Performance</p>
        </div>
        <span className="text-[11px] text-slate-500">{sites.length} units</span>
      </div>
      <div className="max-h-[24rem] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-black/95 backdrop-blur">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-2 text-left font-medium">Site</th>
              <th className="px-3 py-2 text-right font-medium">Earnings YTD</th>
              <th className="px-3 py-2 text-right font-medium">SoC</th>
              <th className="px-3 py-2 text-right font-medium">Power</th>
              <th className="px-5 py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s) => {
              const status = STATUS[s.status];
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect?.(s.id)}
                  className={`cursor-pointer border-t border-white/[0.04] transition hover:bg-white/[0.02] ${
                    selectedId === s.id ? "bg-cyan-500/[0.05]" : ""
                  }`}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-slate-300">{s.cc}</span>
                      <div>
                        <p className="font-medium text-slate-100">{s.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.region}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-white">{fmt.ntd(s.kpi.earnings)}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="ml-auto flex w-24 items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className="h-full rounded-full bg-cyan-400" style={{ width: `${s.soc}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-slate-300">{s.soc}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-slate-200">
                    {s.currentPowerMw > 0 ? "+" : ""}{s.currentPowerMw.toFixed(1)} MW
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${status.chip}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsFeed({ alerts }) {
  return (
    <div className={`flex h-full flex-col ${card}`}>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <p className={sectionLabel}>Active Alerts</p>
        </div>
        <span className="rounded-full border border-rose-500/25 bg-rose-500/5 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">
          {alerts.length}
        </span>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto p-3">
        {alerts.length === 0 && (
          <li className="rounded-md border border-white/[0.06] bg-white/[0.015] p-4 text-center text-xs text-slate-500">
            No active alerts.
          </li>
        )}
        {alerts.map((a) => {
          const s = ALERT[a.level];
          const Icon = s.icon;
          return (
            <li key={a.id} className={`rounded-md border border-white/[0.06] bg-white/[0.015] p-3 ring-1 ${s.ring}`}>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-6 w-6 place-items-center rounded bg-white/[0.03]">
                  <Icon className={`h-3 w-3 ${s.text}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${s.text}`}>{a.level}</span>
                    <span className="font-mono text-[10px] text-slate-500">{a.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{a.site}</p>
                  <p className="mt-0.5 text-xs text-slate-200">{a.msg}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ROOT                                                                      */
/* -------------------------------------------------------------------------- */

export default function BestWarRoom() {
  const [siteId, setSiteId] = useState("global");
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const site = useMemo(
    () => (siteId === "global" ? GLOBAL : SITES_DATA.find((s) => s.id === siteId) ?? GLOBAL),
    [siteId]
  );
  const tableSites = siteId === "global" ? SITES_DATA : SITES_DATA.filter((s) => s.id === siteId);

  return (
    <div className="min-h-screen w-full bg-black text-slate-200">
      <Header siteId={siteId} onSiteChange={setSiteId} clock={clock} site={site} />

      <main className="mx-auto max-w-[1600px] space-y-5 px-6 py-5">
        {/* Hero: Map + Totals (both 600px tall to keep grid rows even, no overflow) */}
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 h-[600px]">
            <GlobalMap sites={SITES_DATA} selectedId={siteId === "global" ? null : siteId} onSelect={setSiteId} />
          </div>
          <div className="h-[600px]">
            <TotalsPanel />
          </div>
        </section>

        {/* KPI ROW */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard icon={Coins} label="Aggregated Earnings" value={fmt.ntdCompact(site.kpi.earnings)} sub="Year to date" accent="emerald" trend={12.4} />
          <KpiCard icon={Radio} label="VPP Revenue" value={fmt.ntdCompact(site.kpi.vppRevenue)} sub="Ancillary services" accent="cyan" trend={28.1} />
          <KpiCard icon={Zap} label="Energy Savings" value={`${fmt.compact(site.kpi.savings)} kWh`} sub="Peak-shifted load" accent="cyan" trend={6.7} />
          <KpiCard icon={Sun} label="PV Generation" value={`${fmt.compact(site.kpi.pvGeneration)} kWh`} sub="Solar harvested" accent="cyan" trend={-2.1} />
          <KpiCard icon={Leaf} label="CO₂ Avoided" value={`${fmt.compact(site.kpi.co2Avoided)} t`} sub="vs. grid baseline" accent="emerald" trend={9.3} />
        </section>

        {/* Charts row */}
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PowerFlowChart data={site.flow} />
          </div>
          <div className="grid gap-5">
            <SoCDonut soc={site.soc} capacity={site.bestCapacityMwh} />
            <VppStatus vpp={site.activeVpp} />
          </div>
        </section>

        {/* Table + Alerts */}
        <section className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SiteTable sites={tableSites} onSelect={setSiteId} selectedId={siteId === "global" ? null : siteId} />
          </div>
          <AlertsFeed alerts={site.alerts} />
        </section>

        <footer className="flex items-center justify-between border-t border-white/[0.06] pt-4 text-[11px] text-slate-500">
          <span>B.E.S.T. War Room v1.2 · Buima Energy</span>
          <span className="font-mono">node:wr-edge-01 · 4G/Eth · 38ms</span>
        </footer>
      </main>
    </div>
  );
}
