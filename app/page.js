"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Wifi,
  Zap,
  MapPin,
} from "lucide-react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/mapbox";

/* -------------------------------------------------------------------------- */
/*  RAW SITE DATA                                                             */
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
  {
    id: "kaohsiung",
    name: "Kaohsiung Factory A",
    region: "Industrial · Steel Mill",
    country: "Taiwan",
    cc: "TW",
    flag: "🇹🇼",
    lat: 22.6273,
    lng: 120.3014,
    kpi: { earnings: 4_210_000, vppRevenue: 1_120_400, savings: 612_300, pvGeneration: 2_180_500, co2Avoided: 1_082 },
    soc: 81, bestCapacityMwh: 18.6, currentPowerMw: 3.8, status: "DISCHARGING",
    activeVpp: { status: "DISPATCHING", power: 3.8, command: "Spinning Reserve", eta: "00:21:04" },
    flow: buildHourlyCurve(310, 180, 240),
    alerts: [
      { id: 11, level: "warning", site: "Kaohsiung Factory A", msg: "Cell-group voltage delta 32mV approaching threshold", time: "11:54:11" },
    ],
  },
  {
    id: "taipei",
    name: "Taipei HQ Tower",
    region: "Commercial · Class-A Office",
    country: "Taiwan",
    cc: "TW",
    flag: "🇹🇼",
    lat: 25.0330,
    lng: 121.5654,
    kpi: { earnings: 3_180_500, vppRevenue: 940_200, savings: 488_900, pvGeneration: 1_240_600, co2Avoided: 612 },
    soc: 64, bestCapacityMwh: 12.4, currentPowerMw: 2.1, status: "VPP DISPATCH",
    activeVpp: { status: "DISPATCHING", power: 2.1, command: "Peak Shaving", eta: "00:38:11" },
    flow: buildHourlyCurve(180, 220, 380),
    alerts: [
      { id: 21, level: "info", site: "Taipei HQ Tower", msg: "Peak-shaving event begins — target 1.8 MW", time: "12:30:00" },
    ],
  },
  {
    id: "taichung",
    name: "Taichung Logistics",
    region: "Distribution · Cold Chain",
    country: "Taiwan",
    cc: "TW",
    flag: "🇹🇼",
    lat: 24.1477,
    lng: 120.6736,
    kpi: { earnings: 2_945_800, vppRevenue: 612_400, savings: 401_200, pvGeneration: 1_810_400, co2Avoided: 894 },
    soc: 47, bestCapacityMwh: 9.2, currentPowerMw: -1.6, status: "CHARGING",
    activeVpp: { status: "STANDBY", power: 0, command: "Awaiting dispatch", eta: "—" },
    flow: buildHourlyCurve(260, 140, 310),
    alerts: [],
  },
  {
    id: "tainan",
    name: "Tainan Solar Farm",
    region: "Utility-Scale PV",
    country: "Taiwan",
    cc: "TW",
    flag: "🇹🇼",
    lat: 22.9999,
    lng: 120.2270,
    kpi: { earnings: 2_710_300, vppRevenue: 480_100, savings: 90_400, pvGeneration: 4_120_800, co2Avoided: 2_034 },
    soc: 92, bestCapacityMwh: 22.0, currentPowerMw: 0, status: "STANDBY",
    activeVpp: { status: "STANDBY", power: 0, command: "Awaiting dispatch", eta: "—" },
    flow: buildHourlyCurve(540, 90, 60),
    alerts: [
      { id: 41, level: "info", site: "Tainan Solar Farm", msg: "PV curtailment lifted — output restored to 4.1 MW", time: "11:20:43" },
    ],
  },
  {
    id: "hsinchu",
    name: "Hsinchu Fab Annex",
    region: "Semiconductor · Cleanroom",
    country: "Taiwan",
    cc: "TW",
    flag: "🇹🇼",
    lat: 24.8138,
    lng: 120.9675,
    kpi: { earnings: 2_104_700, vppRevenue: 410_500, savings: 388_100, pvGeneration: 980_200, co2Avoided: 481 },
    soc: 55, bestCapacityMwh: 8.4, currentPowerMw: 4.2, status: "DISCHARGING",
    activeVpp: { status: "DISPATCHING", power: 4.2, command: "Demand Response", eta: "00:12:55" },
    flow: buildHourlyCurve(150, 240, 520),
    alerts: [
      { id: 51, level: "warning", site: "Hsinchu Fab Annex", msg: "SoC dropping faster than forecast during peak window", time: "12:31:55" },
    ],
  },
  {
    id: "taoyuan",
    name: "Taoyuan DC-2",
    region: "Hyperscale Data Center",
    country: "Taiwan",
    cc: "TW",
    flag: "🇹🇼",
    lat: 25.0098,
    lng: 121.2952,
    kpi: { earnings: 1_805_000, vppRevenue: 220_400, savings: 312_500, pvGeneration: 620_800, co2Avoided: 305 },
    soc: 38, bestCapacityMwh: 7.2, currentPowerMw: 0, status: "FAULT",
    activeVpp: { status: "STANDBY", power: 0, command: "Module isolated", eta: "—" },
    flow: buildHourlyCurve(120, 80, 410),
    alerts: [
      { id: 61, level: "critical", site: "Taoyuan DC-2", msg: "Inverter #3 over-temperature 78°C — module isolated", time: "12:42:08" },
    ],
  },
  {
    id: "yokohama",
    name: "Yokohama Factory",
    region: "Industrial · Auto Parts",
    country: "Japan",
    cc: "JP",
    flag: "🇯🇵",
    lat: 35.4437,
    lng: 139.6380,
    kpi: { earnings: 6_240_000, vppRevenue: 1_410_000, savings: 805_000, pvGeneration: 3_120_000, co2Avoided: 1_540 },
    soc: 76, bestCapacityMwh: 24.0, currentPowerMw: 5.6, status: "DISCHARGING",
    activeVpp: { status: "DISPATCHING", power: 5.6, command: "TEPCO Frequency Reg.", eta: "00:18:30" },
    flow: buildHourlyCurve(420, 260, 480),
    alerts: [
      { id: 71, level: "info", site: "Yokohama Factory", msg: "TEPCO frequency-reg. dispatch accepted — 5.6 MW", time: "12:18:00" },
    ],
  },
  {
    id: "osaka",
    name: "Osaka DC-Hub",
    region: "Edge Data Center",
    country: "Japan",
    cc: "JP",
    flag: "🇯🇵",
    lat: 34.6937,
    lng: 135.5023,
    kpi: { earnings: 4_870_000, vppRevenue: 985_000, savings: 510_000, pvGeneration: 1_840_000, co2Avoided: 905 },
    soc: 68, bestCapacityMwh: 16.5, currentPowerMw: 2.8, status: "VPP DISPATCH",
    activeVpp: { status: "DISPATCHING", power: 2.8, command: "Peak Shaving", eta: "00:44:12" },
    flow: buildHourlyCurve(280, 200, 430),
    alerts: [],
  },
  {
    id: "rotterdam",
    name: "Rotterdam Port BESS",
    region: "Port Electrification",
    country: "Netherlands",
    cc: "NL",
    flag: "🇳🇱",
    lat: 51.9244,
    lng: 4.4777,
    kpi: { earnings: 5_120_000, vppRevenue: 1_680_000, savings: 642_000, pvGeneration: 2_410_000, co2Avoided: 1_180 },
    soc: 88, bestCapacityMwh: 32.0, currentPowerMw: 0, status: "STANDBY",
    activeVpp: { status: "STANDBY", power: 0, command: "Awaiting TenneT signal", eta: "—" },
    flow: buildHourlyCurve(380, 320, 520),
    alerts: [
      { id: 91, level: "info", site: "Rotterdam Port BESS", msg: "TenneT aFRR market window opens 14:00 CET", time: "11:00:00" },
    ],
  },
  {
    id: "amsterdam",
    name: "Amsterdam Tower",
    region: "Mixed-Use · Smart Building",
    country: "Netherlands",
    cc: "NL",
    flag: "🇳🇱",
    lat: 52.3676,
    lng: 4.9041,
    kpi: { earnings: 3_210_000, vppRevenue: 720_000, savings: 388_000, pvGeneration: 1_120_000, co2Avoided: 552 },
    soc: 71, bestCapacityMwh: 11.8, currentPowerMw: -0.9, status: "CHARGING",
    activeVpp: { status: "STANDBY", power: 0, command: "Awaiting dispatch", eta: "—" },
    flow: buildHourlyCurve(220, 160, 380),
    alerts: [],
  },
];

/* -------------------------------------------------------------------------- */
/*  AGGREGATION                                                               */
/* -------------------------------------------------------------------------- */

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
  const weightedSoc =
    SITES_DATA.reduce((s, x) => s + x.soc * x.bestCapacityMwh, 0) / totalCapacity;
  const dispatchingPower = SITES_DATA.filter((s) => s.activeVpp.status === "DISPATCHING")
    .reduce((sum, s) => sum + s.activeVpp.power, 0);
  return {
    id: "global",
    name: "Global Aggregate",
    region: `${new Set(SITES_DATA.map((s) => s.country)).size} Countries · ${SITES_DATA.length} Sites`,
    country: "Global",
    cc: "WW",
    flag: "🌐",
    kpi: sumKpi,
    soc: Math.round(weightedSoc),
    bestCapacityMwh: +totalCapacity.toFixed(1),
    activeVpp: {
      status: dispatchingPower > 0 ? "DISPATCHING" : "STANDBY",
      power: +dispatchingPower.toFixed(1),
      command: "Multi-market aggregator",
      eta: "00:14:22",
    },
    flow: sumFlows(SITES_DATA.map((s) => s.flow)),
    alerts: SITES_DATA.flatMap((s) => s.alerts).slice(0, 6),
  };
};

const GLOBAL = buildGlobalAggregate();

/* -------------------------------------------------------------------------- */
/*  HELPERS                                                                   */
/* -------------------------------------------------------------------------- */

const fmtNTD = (n) => `NT$${n.toLocaleString("en-US")}`;
const fmtKWh = (n) => `${n.toLocaleString("en-US")} kWh`;
const fmtCompact = (n) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : `${n}`;

const STATUS_STYLES = {
  DISCHARGING: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  CHARGING: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  "VPP DISPATCH": "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
  STANDBY: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  FAULT: "text-rose-400 bg-rose-500/10 border-rose-500/30",
};

const STATUS_RING = {
  DISCHARGING: { core: "#34d399", glow: "rgba(52,211,153,0.6)" },
  CHARGING: { core: "#60a5fa", glow: "rgba(96,165,250,0.6)" },
  "VPP DISPATCH": { core: "#22d3ee", glow: "rgba(34,211,238,0.7)" },
  STANDBY: { core: "#fbbf24", glow: "rgba(251,191,36,0.55)" },
  FAULT: { core: "#fb7185", glow: "rgba(251,113,133,0.7)" },
};

const ALERT_STYLES = {
  critical: { ring: "ring-rose-500/40", text: "text-rose-300", icon: AlertTriangle },
  warning: { ring: "ring-amber-500/40", text: "text-amber-200", icon: AlertTriangle },
  info: { ring: "ring-cyan-500/40", text: "text-cyan-200", icon: Radio },
};

/* -------------------------------------------------------------------------- */
/*  HEADER                                                                    */
/* -------------------------------------------------------------------------- */

function Header({ siteId, onSiteChange, clock }) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-800/80 bg-slate-950/60 px-6 py-4 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_-4px_rgba(34,211,238,0.6)]">
          <Bolt className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-wide text-white lg:text-2xl">
            B.E.S.T. <span className="text-cyan-300">Global Command Center</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Buima Energy Storage Tile · War Room
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 font-mono text-sm text-slate-200">
          <CircleDot className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          <span className="hidden text-xs text-slate-500 sm:inline">LIVE</span>
          <span>{clock}</span>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm">
          <button
            onClick={() => onSiteChange("global")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
              siteId === "global"
                ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Globe2 className="h-4 w-4" /> Global
          </button>
          <span className="h-4 w-px bg-slate-700" />
          <select
            value={siteId === "global" ? "" : siteId}
            onChange={(e) => onSiteChange(e.target.value || "global")}
            className="cursor-pointer rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200 outline-none focus:border-cyan-400"
          >
            <option value="">Specific Site…</option>
            {SITES_DATA.map((s) => (
              <option key={s.id} value={s.id}>
                {s.flag} {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 lg:flex">
          <Wifi className="h-4 w-4" /> SCADA · MQTT OK
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  GLOBAL MAP                                                                */
/* -------------------------------------------------------------------------- */

function PulsingMarker({ status, selected }) {
  const c = STATUS_RING[status] ?? STATUS_RING.STANDBY;
  return (
    <div className="relative -translate-x-1/2 -translate-y-1/2">
      <span
        className="absolute inset-0 m-auto h-7 w-7 animate-ping rounded-full opacity-50"
        style={{ background: c.core }}
      />
      <span
        className={`relative block rounded-full ring-2 transition-all ${
          selected ? "h-5 w-5" : "h-3.5 w-3.5"
        }`}
        style={{
          background: c.core,
          boxShadow: `0 0 14px 2px ${c.glow}`,
          ringColor: "rgba(255,255,255,0.5)",
        }}
      />
    </div>
  );
}

function SitePopupCard({ site }) {
  return (
    <div className="min-w-[220px] p-3 font-sans">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {site.flag} {site.country}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white">{site.name}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[site.status]}`}
        >
          {site.status}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">{site.region}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-slate-800 bg-slate-950/50 p-2">
          <p className="text-[10px] text-slate-500">Power</p>
          <p className={`mt-0.5 font-mono text-base ${site.currentPowerMw >= 0 ? "text-emerald-300" : "text-blue-300"}`}>
            {site.currentPowerMw > 0 ? "+" : ""}
            {site.currentPowerMw.toFixed(1)} MW
          </p>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/50 p-2">
          <p className="text-[10px] text-slate-500">SoC</p>
          <p className="mt-0.5 font-mono text-base text-cyan-300">{site.soc}%</p>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/50 p-2">
          <p className="text-[10px] text-slate-500">Capacity</p>
          <p className="mt-0.5 font-mono text-base text-white">{site.bestCapacityMwh} MWh</p>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/50 p-2">
          <p className="text-[10px] text-slate-500">Earnings YTD</p>
          <p className="mt-0.5 font-mono text-base text-emerald-300">
            ${(site.kpi.earnings / 1000).toFixed(0)}K
          </p>
        </div>
      </div>
      <p className="mt-2.5 text-center text-[10px] text-cyan-400/70">click to drill in →</p>
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
          <p className="text-sm font-medium text-rose-300">NEXT_PUBLIC_MAPBOX_TOKEN not configured</p>
          <p className="mt-1 text-xs text-slate-400">
            Set the env var locally in <code>.env.local</code> and on Vercel → Settings → Environment Variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
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
          <Marker
            key={s.id}
            longitude={s.lng}
            latitude={s.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelect(s.id);
            }}
          >
            <div
              onMouseEnter={() => setHoverId(s.id)}
              onMouseLeave={() => setHoverId(null)}
              className="cursor-pointer"
            >
              <PulsingMarker status={s.status} selected={selectedId === s.id} />
            </div>
          </Marker>
        ))}
        {hoverSite && (
          <Popup
            longitude={hoverSite.lng}
            latitude={hoverSite.lat}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={18}
            maxWidth="280px"
          >
            <SitePopupCard site={hoverSite} />
          </Popup>
        )}
      </Map>

      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-cyan-200 backdrop-blur">
        <MapPin className="h-3.5 w-3.5" /> {sites.length} Active Sites · {new Set(sites.map((s) => s.country)).size} Countries
      </div>

      <div className="pointer-events-none absolute bottom-3 left-4 flex flex-wrap gap-x-3 gap-y-1.5 rounded-lg border border-slate-700/60 bg-slate-950/70 px-3 py-2 text-[10px] uppercase tracking-wider text-slate-300 backdrop-blur">
        {Object.entries(STATUS_RING).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: v.core, boxShadow: `0 0 6px ${v.glow}` }}
            />
            {k.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  TOTALS PANEL                                                              */
/* -------------------------------------------------------------------------- */

function TotalsPanel() {
  const t = GLOBAL;
  const dispatching = SITES_DATA.filter((s) => s.activeVpp.status === "DISPATCHING").length;
  const offline = SITES_DATA.filter((s) => s.status === "FAULT").length;
  const countries = SITES_DATA.reduce((acc, s) => {
    const k = s.country;
    if (!acc[k]) acc[k] = { name: s.country, flag: s.flag, count: 0, earnings: 0 };
    acc[k].count++;
    acc[k].earnings += s.kpi.earnings;
    return acc;
  }, {});
  const countryRows = Object.values(countries).sort((a, b) => b.earnings - a.earnings);
  const totalEarnings = t.kpi.earnings;
  const consumptionMw = +SITES_DATA.reduce((s, x) => s + Math.max(0, -x.currentPowerMw), 0).toFixed(1);
  const productionMw = +SITES_DATA.reduce((s, x) => s + Math.max(0, x.currentPowerMw), 0).toFixed(1);

  const gauge = [{ name: "soc", value: t.soc, fill: "#22d3ee" }];

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Aggregate</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Global Performance</h2>
        </div>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-cyan-300">
          Live
        </span>
      </div>

      {/* Hero earnings */}
      <div className="mt-4 rounded-lg border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-4">
        <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/80">Total Earnings YTD</p>
        <p className="mt-1 font-mono text-3xl font-semibold text-white">{fmtNTD(totalEarnings)}</p>
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-300">
          <TrendingUp className="h-3 w-3" /> +18.4% vs. last 30d
        </div>
      </div>

      {/* SoC gauge + power flow */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Aggregate SoC</p>
          <div className="relative mt-1 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="70%" outerRadius="100%" data={gauge} startAngle={210} endAngle={-30} barSize={8}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar background={{ fill: "#1e293b" }} dataKey="value" cornerRadius={6} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-xl font-semibold text-white">
                {t.soc}
                <span className="text-xs text-cyan-300">%</span>
              </span>
            </div>
          </div>
          <p className="mt-1 text-center text-[10px] text-slate-400">
            <span className="font-mono text-cyan-300">{((t.bestCapacityMwh * t.soc) / 100).toFixed(1)}</span>
            <span className="text-slate-500"> / {t.bestCapacityMwh.toFixed(1)} MWh</span>
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Live Power Flow</p>
          <div className="mt-3 space-y-2.5 text-xs">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-300">Production</span>
                <span className="font-mono text-white">+{productionMw.toFixed(1)} MW</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                  style={{ width: `${Math.min(100, (productionMw / (productionMw + consumptionMw + 0.1)) * 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-blue-300">Consumption</span>
                <span className="font-mono text-white">{consumptionMw.toFixed(1)} MW</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-300"
                  style={{ width: `${Math.min(100, (consumptionMw / (productionMw + consumptionMw + 0.1)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mini stat grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat icon={Sun} label="PV YTD" value={`${(t.kpi.pvGeneration / 1000).toFixed(0)}K kWh`} accent="amber" />
        <Stat icon={Radio} label="VPP YTD" value={fmtNTD(t.kpi.vppRevenue)} accent="cyan" />
        <Stat icon={Leaf} label="CO₂ Avoided" value={`${fmtCompact(t.kpi.co2Avoided)} t`} accent="emerald" />
        <Stat icon={Zap} label="Saved" value={`${(t.kpi.savings / 1000).toFixed(0)}K kWh`} accent="teal" />
      </div>

      {/* Country breakdown */}
      <div className="mt-4 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">By Country</p>
        <div className="mt-2 space-y-1.5">
          {countryRows.map((c) => {
            const pct = (c.earnings / totalEarnings) * 100;
            return (
              <div key={c.name} className="flex items-center gap-3 rounded border border-slate-800 bg-slate-950/40 px-2.5 py-1.5 text-xs">
                <span className="text-base">{c.flag}</span>
                <span className="text-slate-200">{c.name}</span>
                <span className="ml-auto font-mono text-slate-400">{c.count} sites</span>
                <span className="font-mono text-cyan-300">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Foot summary */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 text-center text-[10px] uppercase tracking-wider text-slate-500">
        <div>
          <p className="font-mono text-base text-white">{SITES_DATA.length}</p>
          <p>Sites</p>
        </div>
        <div>
          <p className="font-mono text-base text-emerald-300">{dispatching}</p>
          <p>Dispatching</p>
        </div>
        <div>
          <p className={`font-mono text-base ${offline > 0 ? "text-rose-300" : "text-slate-400"}`}>{offline}</p>
          <p>Faults</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }) {
  const colors = {
    amber: "text-amber-300 border-amber-500/20 bg-amber-500/5",
    cyan: "text-cyan-300 border-cyan-500/20 bg-cyan-500/5",
    emerald: "text-emerald-300 border-emerald-500/20 bg-emerald-500/5",
    teal: "text-teal-300 border-teal-500/20 bg-teal-500/5",
  };
  return (
    <div className={`rounded-lg border ${colors[accent]} p-2.5`}>
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3" />
        <p className="text-[10px] uppercase tracking-wider opacity-80">{label}</p>
      </div>
      <p className="mt-1 font-mono text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  KPI & CHARTS                                                              */
/* -------------------------------------------------------------------------- */

function KpiCard({ icon: Icon, label, value, sub, accent = "cyan", trend }) {
  const accents = {
    cyan: "from-cyan-500/20 to-cyan-500/0 text-cyan-300 border-cyan-400/20",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300 border-emerald-400/20",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-300 border-amber-400/20",
    teal: "from-teal-500/20 to-teal-500/0 text-teal-300 border-teal-400/20",
  };
  return (
    <div className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${accents[accent]} bg-slate-900/70 p-5 shadow-lg backdrop-blur`}>
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-current opacity-10 blur-2xl" />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg border border-current/30 bg-current/10">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend != null && (
        <div className="mt-4 flex items-center gap-1.5 text-xs">
          <TrendingUp className={`h-3.5 w-3.5 ${trend >= 0 ? "text-emerald-400" : "rotate-180 text-rose-400"}`} />
          <span className={trend >= 0 ? "text-emerald-300" : "text-rose-300"}>
            {trend >= 0 ? "+" : ""}
            {trend}% vs. last 30d
          </span>
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-mono text-slate-400">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-300">{p.name}</span>
          <span className="ml-auto font-mono font-semibold text-white">
            {Number(p.value).toFixed(1)} kW
          </span>
        </div>
      ))}
    </div>
  );
}

function PowerFlowChart({ data }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            <Activity className="h-4 w-4 text-cyan-400" /> Daily Power Flow
          </h2>
          <p className="text-xs text-slate-500">PV generation · BESS discharge · Grid import — kW</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> PV</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" /> BESS Discharge</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Grid Import</span>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="pvFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" stroke="#1e293b" />
            <XAxis dataKey="hour" stroke="#475569" tick={{ fontSize: 11 }} interval={2} />
            <YAxis yAxisId="left" stroke="#475569" tick={{ fontSize: 11 }} label={{ value: "kW", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#475569" tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(34,211,238,0.06)" }} />
            <Area yAxisId="left" type="monotone" dataKey="pv" name="PV Generation" stroke="#fbbf24" strokeWidth={2} fill="url(#pvFill)" />
            <Bar yAxisId="left" dataKey="bestDischarge" name="BESS Discharge" fill="#22d3ee" radius={[3, 3, 0, 0]} barSize={10} />
            <Line yAxisId="left" type="monotone" dataKey="grid" name="Grid Import" stroke="#fb7185" strokeWidth={2} dot={false} strokeDasharray="4 4" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SoCDonut({ soc, capacity }) {
  const data = [{ name: "soc", value: soc, fill: "#22d3ee" }];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
        <BatteryCharging className="h-4 w-4 text-cyan-400" /> State of Charge
      </h2>
      <div className="relative mt-2 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={220} endAngle={-40} barSize={14}>
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: "#1e293b" }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-4xl font-semibold tracking-tight text-white">
            {soc}<span className="text-xl text-cyan-300">%</span>
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.25em] text-slate-400">SoC · Healthy</span>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
          <p className="text-slate-500">Total</p>
          <p className="mt-0.5 font-mono text-base text-white">{capacity.toFixed(1)} MWh</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
          <p className="text-slate-500">Available</p>
          <p className="mt-0.5 font-mono text-base text-cyan-300">{((capacity * soc) / 100).toFixed(1)} MWh</p>
        </div>
      </div>
    </div>
  );
}

function VppStatus({ vpp }) {
  const dispatching = vpp.status === "DISPATCHING";
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          <Radio className="h-4 w-4 text-cyan-400" /> VPP Dispatch
        </h2>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
            dispatching
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
              : "border-amber-400/40 bg-amber-500/10 text-amber-300"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${dispatching ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`} />
          {vpp.status}
        </span>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">Active Command</p>
          <p className="font-mono text-base text-white">{vpp.command}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
            <p className="text-xs text-slate-400">Dispatched</p>
            <p className="mt-1 font-mono text-xl text-cyan-300">{vpp.power.toFixed(1)} MW</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-xs text-slate-400">Time Left</p>
            <p className="mt-1 font-mono text-xl text-white">{vpp.eta}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteTable({ sites, onSelect, selectedId }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          <Factory className="h-4 w-4 text-cyan-400" /> Site Performance
        </h2>
        <span className="text-xs text-slate-500">{sites.length} units</span>
      </div>
      <div className="max-h-[24rem] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900/95 text-xs uppercase tracking-wider text-slate-500 backdrop-blur">
            <tr>
              <th className="px-5 py-2.5 text-left font-medium">Site</th>
              <th className="px-3 py-2.5 text-right font-medium">Earnings</th>
              <th className="px-3 py-2.5 text-right font-medium">SoC</th>
              <th className="px-3 py-2.5 text-right font-medium">Power</th>
              <th className="px-5 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s, i) => (
              <tr
                key={s.id ?? s.name ?? i}
                onClick={() => s.id && onSelect?.(s.id)}
                className={`cursor-pointer border-t border-slate-800/60 transition hover:bg-slate-800/40 ${
                  selectedId === s.id ? "bg-cyan-500/5" : ""
                }`}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-base">{s.flag ?? "•"}</span>
                    <div>
                      <p className="font-medium text-slate-100">{s.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.region}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono text-white">{fmtNTD(s.kpi.earnings)}</td>
                <td className="px-3 py-3 text-right">
                  <div className="ml-auto flex w-24 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400" style={{ width: `${s.soc}%` }} />
                    </div>
                    <span className="font-mono text-xs text-slate-300">{s.soc}%</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono text-slate-200">
                  {s.currentPowerMw > 0 ? "+" : ""}
                  {s.currentPowerMw.toFixed(1)} MW
                </td>
                <td className="px-5 py-3 text-right">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[s.status]}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsFeed({ alerts }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/70 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          <AlertTriangle className="h-4 w-4 text-amber-400" /> Active Alerts
        </h2>
        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-medium text-rose-300">
          {alerts.length}
        </span>
      </div>
      <ul className="flex-1 space-y-2 overflow-y-auto p-4">
        {alerts.length === 0 && (
          <li className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-center text-xs text-slate-500">
            No active alerts.
          </li>
        )}
        {alerts.map((a) => {
          const s = ALERT_STYLES[a.level];
          const Icon = s.icon;
          return (
            <li key={a.id} className={`rounded-lg border border-slate-800 bg-slate-950/40 p-3 ring-1 ${s.ring}`}>
              <div className="flex items-start gap-3">
                <span className="mt-1 grid h-7 w-7 place-items-center rounded-md bg-slate-800/60">
                  <Icon className={`h-3.5 w-3.5 ${s.text}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${s.text}`}>{a.level}</span>
                    <span className="font-mono text-[10px] text-slate-500">{a.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-slate-300">{a.site}</p>
                  <p className="mt-1 text-sm text-slate-100">{a.msg}</p>
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

  const site = useMemo(() => {
    if (siteId === "global") return GLOBAL;
    return SITES_DATA.find((s) => s.id === siteId) ?? GLOBAL;
  }, [siteId]);

  const tableSites = siteId === "global" ? SITES_DATA : SITES_DATA.filter((s) => s.id === siteId);

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_#0b1220_0%,_#020617_60%)] text-slate-200">
      <Header siteId={siteId} onSiteChange={setSiteId} clock={clock} />

      <main className="mx-auto max-w-[1600px] space-y-5 px-6 py-6">
        {/* Hero: Map + Totals */}
        <section className="grid gap-5 lg:grid-cols-3" style={{ minHeight: "520px" }}>
          <div className="lg:col-span-2 h-[520px]">
            <GlobalMap sites={SITES_DATA} selectedId={siteId === "global" ? null : siteId} onSelect={setSiteId} />
          </div>
          <div className="h-[520px]">
            <TotalsPanel />
          </div>
        </section>

        {/* Selected site banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-base text-cyan-300">
              {site.flag ?? "🌐"}
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Currently Viewing</p>
              <p className="text-lg font-semibold text-white">{site.name}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            <span className="text-slate-500">Region:</span> {site.region} ·{" "}
            <span className="text-slate-500">Capacity:</span>{" "}
            <span className="font-mono text-cyan-300">{site.bestCapacityMwh.toFixed(1)} MWh</span>
          </p>
        </div>

        {/* KPI ROW */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard icon={Coins} label="Aggregated Earnings" value={fmtNTD(site.kpi.earnings)} sub="Year to date" accent="emerald" trend={12.4} />
          <KpiCard icon={Radio} label="VPP Revenue" value={fmtNTD(site.kpi.vppRevenue)} sub="Ancillary services" accent="cyan" trend={28.1} />
          <KpiCard icon={Zap} label="Energy Savings" value={fmtKWh(site.kpi.savings)} sub="Peak-shifted load" accent="teal" trend={6.7} />
          <KpiCard icon={Sun} label="PV Generation" value={fmtKWh(site.kpi.pvGeneration)} sub="Solar harvested" accent="amber" trend={-2.1} />
          <KpiCard icon={Leaf} label="CO₂ Avoided" value={`${fmtCompact(site.kpi.co2Avoided)} t`} sub="vs. grid baseline" accent="emerald" trend={9.3} />
        </section>

        {/* Charts */}
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

        <footer className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-500">
          <span>B.E.S.T. War Room v1.1 · Buima Energy</span>
          <span className="font-mono">node:wr-edge-01 · uplink: 4G/Eth · latency 38ms</span>
        </footer>
      </main>
    </div>
  );
}
