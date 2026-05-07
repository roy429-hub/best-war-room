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
  Wifi,
  Zap,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  DUMMY DATA                                                                */
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

const SITES = {
  global: {
    id: "global",
    name: "Global Aggregate",
    region: "Taiwan · 14 Sites",
    kpi: {
      earnings: 18_742_300,
      vppRevenue: 4_215_600,
      savings: 2_318_400,
      pvGeneration: 9_842_100,
      co2Avoided: 4_873,
    },
    soc: 72,
    bestCapacityMwh: 86.4,
    activeVpp: { status: "DISPATCHING", power: 12.4, command: "TPC Frequency Reg.", eta: "00:14:22" },
    flow: buildHourlyCurve(820, 410, 640),
    sites: [
      { name: "Kaohsiung Factory A", roi: 18.2, earnings: 4_210_000, soc: 81, status: "DISCHARGING", power: 3.8 },
      { name: "Taipei HQ Tower", roi: 14.6, earnings: 3_180_500, soc: 64, status: "VPP DISPATCH", power: 2.1 },
      { name: "Taichung Logistics", roi: 16.1, earnings: 2_945_800, soc: 47, status: "CHARGING", power: -1.6 },
      { name: "Tainan Solar Farm", roi: 21.4, earnings: 2_710_300, soc: 92, status: "STANDBY", power: 0 },
      { name: "Hsinchu Fab Annex", roi: 12.9, earnings: 2_104_700, soc: 55, status: "DISCHARGING", power: 4.2 },
      { name: "Taoyuan DC-2", roi: 11.4, earnings: 1_805_000, soc: 38, status: "FAULT", power: 0 },
      { name: "Yilan Cold Storage", roi: 9.8, earnings: 985_400, soc: 68, status: "CHARGING", power: -0.9 },
    ],
    alerts: [
      { id: 1, level: "critical", site: "Taoyuan DC-2", msg: "Inverter #3 over-temperature 78°C — module isolated", time: "12:42:08" },
      { id: 2, level: "warning", site: "Hsinchu Fab Annex", msg: "SoC dropping faster than forecast during peak window", time: "12:31:55" },
      { id: 3, level: "info", site: "Global", msg: "VPP frequency-reg. dispatch accepted by TPC — 12.4 MW", time: "12:28:00" },
      { id: 4, level: "warning", site: "Kaohsiung Factory A", msg: "Cell-group voltage delta 32mV approaching threshold", time: "11:54:11" },
      { id: 5, level: "info", site: "Tainan Solar Farm", msg: "PV curtailment lifted — output restored to 4.1 MW", time: "11:20:43" },
    ],
  },
  kaohsiung: {
    id: "kaohsiung",
    name: "Kaohsiung Factory A",
    region: "Kaohsiung · Industrial",
    kpi: {
      earnings: 4_210_000,
      vppRevenue: 1_120_400,
      savings: 612_300,
      pvGeneration: 2_180_500,
      co2Avoided: 1_082,
    },
    soc: 81,
    bestCapacityMwh: 18.6,
    activeVpp: { status: "DISPATCHING", power: 3.8, command: "Spinning Reserve", eta: "00:21:04" },
    flow: buildHourlyCurve(310, 180, 240),
    sites: [
      { name: "Line-A Roof PV", roi: 19.2, earnings: 1_640_000, soc: 84, status: "DISCHARGING", power: 1.6 },
      { name: "Line-B Roof PV", roi: 17.8, earnings: 1_410_000, soc: 79, status: "DISCHARGING", power: 1.4 },
      { name: "Carport Array", roi: 16.4, earnings: 820_400, soc: 80, status: "STANDBY", power: 0.2 },
      { name: "Substation BESS", roi: 21.0, earnings: 339_600, soc: 88, status: "VPP DISPATCH", power: 0.6 },
    ],
    alerts: [
      { id: 1, level: "warning", site: "Line-A BESS", msg: "Cell-group voltage delta 32mV approaching threshold", time: "11:54:11" },
      { id: 2, level: "info", site: "Substation BESS", msg: "VPP spinning-reserve event accepted", time: "11:42:00" },
      { id: 3, level: "info", site: "Carport Array", msg: "Tilt sensor recalibrated after maintenance", time: "10:18:30" },
    ],
  },
  taipei: {
    id: "taipei",
    name: "Taipei HQ Tower",
    region: "Taipei · Commercial",
    kpi: {
      earnings: 3_180_500,
      vppRevenue: 940_200,
      savings: 488_900,
      pvGeneration: 1_240_600,
      co2Avoided: 612,
    },
    soc: 64,
    bestCapacityMwh: 12.4,
    activeVpp: { status: "DISPATCHING", power: 2.1, command: "Peak Shaving", eta: "00:38:11" },
    flow: buildHourlyCurve(180, 220, 380),
    sites: [
      { name: "Tower Rooftop PV", roi: 13.4, earnings: 1_120_000, soc: 62, status: "DISCHARGING", power: 1.2 },
      { name: "Basement BESS-1", roi: 15.6, earnings: 980_500, soc: 66, status: "VPP DISPATCH", power: 0.9 },
      { name: "Basement BESS-2", roi: 14.9, earnings: 720_000, soc: 64, status: "DISCHARGING", power: 0.8 },
      { name: "Façade BIPV", roi: 11.2, earnings: 360_000, soc: 70, status: "STANDBY", power: 0 },
    ],
    alerts: [
      { id: 1, level: "info", site: "HQ Tower", msg: "Peak-shaving event begins — target 1.8 MW", time: "12:30:00" },
      { id: 2, level: "warning", site: "Basement BESS-2", msg: "HVAC airflow degraded 12% — schedule service", time: "09:11:42" },
    ],
  },
  taichung: {
    id: "taichung",
    name: "Taichung Logistics",
    region: "Taichung · Distribution",
    kpi: {
      earnings: 2_945_800,
      vppRevenue: 612_400,
      savings: 401_200,
      pvGeneration: 1_810_400,
      co2Avoided: 894,
    },
    soc: 47,
    bestCapacityMwh: 9.2,
    activeVpp: { status: "STANDBY", power: 0, command: "Awaiting dispatch", eta: "—" },
    flow: buildHourlyCurve(260, 140, 310),
    sites: [
      { name: "Warehouse-1 PV", roi: 18.0, earnings: 1_240_000, soc: 49, status: "CHARGING", power: -0.8 },
      { name: "Warehouse-2 PV", roi: 17.2, earnings: 980_000, soc: 45, status: "CHARGING", power: -0.8 },
      { name: "EV-Charge Hub", roi: 12.4, earnings: 510_300, soc: 52, status: "DISCHARGING", power: 0.4 },
      { name: "Cold-Dock BESS", roi: 14.0, earnings: 215_500, soc: 41, status: "STANDBY", power: 0 },
    ],
    alerts: [
      { id: 1, level: "warning", site: "Warehouse-2 PV", msg: "String-7 underperforming 8% vs. neighbours", time: "10:45:18" },
      { id: 2, level: "info", site: "EV-Charge Hub", msg: "3 vehicles charging — 240 kW total draw", time: "10:12:04" },
    ],
  },
};

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

const ALERT_STYLES = {
  critical: { ring: "ring-rose-500/40", dot: "bg-rose-500", text: "text-rose-300", icon: AlertTriangle },
  warning: { ring: "ring-amber-500/40", dot: "bg-amber-400", text: "text-amber-200", icon: AlertTriangle },
  info: { ring: "ring-cyan-500/40", dot: "bg-cyan-400", text: "text-cyan-200", icon: Radio },
};

/* -------------------------------------------------------------------------- */
/*  SUB-COMPONENTS                                                            */
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
            {Object.values(SITES)
              .filter((s) => s.id !== "global")
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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

function KpiCard({ icon: Icon, label, value, sub, accent = "cyan", trend }) {
  const accents = {
    cyan: "from-cyan-500/20 to-cyan-500/0 text-cyan-300 border-cyan-400/20",
    emerald: "from-emerald-500/20 to-emerald-500/0 text-emerald-300 border-emerald-400/20",
    amber: "from-amber-500/20 to-amber-500/0 text-amber-300 border-amber-400/20",
    blue: "from-blue-500/20 to-blue-500/0 text-blue-300 border-blue-400/20",
    teal: "from-teal-500/20 to-teal-500/0 text-teal-300 border-teal-400/20",
  };
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${accents[accent]} bg-slate-900/70 p-5 shadow-lg backdrop-blur`}
    >
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
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> PV
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" /> BESS Discharge
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-400" /> Grid Import
          </span>
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
            <YAxis
              yAxisId="left"
              stroke="#475569"
              tick={{ fontSize: 11 }}
              label={{ value: "kW", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }}
            />
            <YAxis yAxisId="right" orientation="right" stroke="#475569" tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(34,211,238,0.06)" }} />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="pv"
              name="PV Generation"
              stroke="#fbbf24"
              strokeWidth={2}
              fill="url(#pvFill)"
            />
            <Bar
              yAxisId="left"
              dataKey="bestDischarge"
              name="BESS Discharge"
              fill="#22d3ee"
              radius={[3, 3, 0, 0]}
              barSize={10}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="grid"
              name="Grid Import"
              stroke="#fb7185"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 4"
            />
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
        <BatteryCharging className="h-4 w-4 text-cyan-400" /> Aggregate State of Charge
      </h2>
      <div className="relative mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={data}
            startAngle={220}
            endAngle={-40}
            barSize={14}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar background={{ fill: "#1e293b" }} dataKey="value" cornerRadius={8} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-5xl font-semibold tracking-tight text-white">
            {soc}
            <span className="text-2xl text-cyan-300">%</span>
          </span>
          <span className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">SoC · Healthy</span>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
          <p className="text-slate-500">Total Capacity</p>
          <p className="mt-0.5 font-mono text-base text-white">{capacity.toFixed(1)} MWh</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
          <p className="text-slate-500">Available Now</p>
          <p className="mt-0.5 font-mono text-base text-cyan-300">
            {((capacity * soc) / 100).toFixed(1)} MWh
          </p>
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
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              dispatching ? "animate-pulse bg-emerald-400" : "bg-amber-400"
            }`}
          />
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
            <p className="text-xs text-slate-400">Dispatched Power</p>
            <p className="mt-1 font-mono text-2xl text-cyan-300">{vpp.power.toFixed(1)} MW</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-xs text-slate-400">Time Remaining</p>
            <p className="mt-1 font-mono text-2xl text-white">{vpp.eta}</p>
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/30 p-3 text-xs text-slate-400">
          <span className="text-slate-300">Counterparty:</span> Taiwan Power Co. — Auto-Bidding Engine{" "}
          <span className="text-emerald-300">online</span>
        </div>
      </div>
    </div>
  );
}

function SiteTable({ sites }) {
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
              <th className="px-3 py-2.5 text-right font-medium">ROI</th>
              <th className="px-3 py-2.5 text-right font-medium">Earnings</th>
              <th className="px-3 py-2.5 text-right font-medium">SoC</th>
              <th className="px-3 py-2.5 text-right font-medium">Power</th>
              <th className="px-5 py-2.5 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {sites.map((s, i) => (
              <tr
                key={s.name}
                className="border-t border-slate-800/60 transition hover:bg-slate-800/40"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-800 font-mono text-xs text-cyan-300">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-medium text-slate-100">{s.name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono text-emerald-300">{s.roi.toFixed(1)}%</td>
                <td className="px-3 py-3 text-right font-mono text-white">{fmtNTD(s.earnings)}</td>
                <td className="px-3 py-3 text-right">
                  <div className="ml-auto flex w-24 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400"
                        style={{ width: `${s.soc}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-slate-300">{s.soc}%</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono text-slate-200">
                  {s.power > 0 ? "+" : ""}
                  {s.power.toFixed(1)} MW
                </td>
                <td className="px-5 py-3 text-right">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[s.status]
                    }`}
                  >
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
        {alerts.map((a) => {
          const s = ALERT_STYLES[a.level];
          const Icon = s.icon;
          return (
            <li
              key={a.id}
              className={`rounded-lg border border-slate-800 bg-slate-950/40 p-3 ring-1 ${s.ring}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 grid h-7 w-7 place-items-center rounded-md ${s.dot}/20`}>
                  <Icon className={`h-3.5 w-3.5 ${s.text}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${s.text}`}>
                      {a.level}
                    </span>
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
        `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(
          d.getSeconds()
        ).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const site = useMemo(() => SITES[siteId] ?? SITES.global, [siteId]);

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,_#0b1220_0%,_#020617_60%)] text-slate-200">
      <Header siteId={siteId} onSiteChange={setSiteId} clock={clock} />

      <main className="mx-auto max-w-[1600px] space-y-5 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
              {site.id === "global" ? <Globe2 className="h-5 w-5" /> : <Factory className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Currently Viewing</p>
              <p className="text-lg font-semibold text-white">{site.name}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">
            <span className="text-slate-500">Region:</span> {site.region} ·{" "}
            <span className="text-slate-500">Capacity:</span>{" "}
            <span className="font-mono text-cyan-300">{site.bestCapacityMwh} MWh</span>
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard icon={Coins} label="Aggregated Earnings" value={fmtNTD(site.kpi.earnings)} sub="Year to date" accent="emerald" trend={12.4} />
          <KpiCard icon={Radio} label="VPP Revenue" value={fmtNTD(site.kpi.vppRevenue)} sub="From ancillary services" accent="cyan" trend={28.1} />
          <KpiCard icon={Zap} label="Energy Savings" value={fmtKWh(site.kpi.savings)} sub="Peak-shifted load" accent="teal" trend={6.7} />
          <KpiCard icon={Sun} label="PV Generation" value={fmtKWh(site.kpi.pvGeneration)} sub="Solar harvested" accent="amber" trend={-2.1} />
          <KpiCard icon={Leaf} label="CO₂ Avoided" value={`${fmtCompact(site.kpi.co2Avoided)} t`} sub="vs. grid baseline" accent="emerald" trend={9.3} />
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PowerFlowChart data={site.flow} />
          </div>
          <div className="grid gap-5">
            <SoCDonut soc={site.soc} capacity={site.bestCapacityMwh} />
            <VppStatus vpp={site.activeVpp} />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SiteTable sites={site.sites} />
          </div>
          <AlertsFeed alerts={site.alerts} />
        </section>

        <footer className="flex items-center justify-between border-t border-slate-800 pt-4 text-xs text-slate-500">
          <span>B.E.S.T. War Room v1.0 · Buima Energy</span>
          <span className="font-mono">node:wr-edge-01 · uplink: 4G/Eth · latency 38ms</span>
        </footer>
      </main>
    </div>
  );
}
