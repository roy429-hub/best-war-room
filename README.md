# B.E.S.T. War Room

Single-page command-center dashboard for **B.E.S.T. (Buima Energy Storage Tile)** — a live demo UI built for wall-mounted operations displays.

Real-time KPIs, daily power-flow telemetry, aggregate State-of-Charge, VPP dispatch status, per-site performance, and an alerts feed. All data is hardcoded for demo purposes; the site selector swaps the entire dashboard between the global aggregate and individual sites.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** with hooks
- **Tailwind CSS v4**
- **Recharts** for visualizations (ComposedChart, RadialBarChart)
- **Lucide React** for iconography

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build

```bash
npm run build
npm start
```

## Project structure

```
app/
├── layout.js      # Root layout, fonts, metadata
├── globals.css    # Tailwind v4 entry, theme tokens
└── page.js        # The entire war-room dashboard
```

## Deploy

Push this repo to GitHub and import it at https://vercel.com/new — Vercel auto-detects Next.js and ships in ~60 seconds. No environment variables required for the demo.
