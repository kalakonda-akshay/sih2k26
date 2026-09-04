# NER-Vision AI

**Predict · Navigate · Deliver**

An AI-assisted logistics and road-accessibility intelligence platform for the eight North Eastern states of India.

> **Smart India Hackathon 2026 — Problem Statement SIH26002**
> AI-Based Smart Logistics and Accessibility Intelligence Platform for the North Eastern Region
> Ministry of Development of North Eastern Region (MDoNER) · Theme: Smart Automation

---

## The problem

Logistics in the North East is not a route-optimisation problem on a dense graph. It is a **survivability problem on a sparse one.**

Between most district pairs there are one or two viable corridors. When a landslide closes a single cutting on NH-13, the alternative is not five percent longer — it is hours longer, or it does not exist. Medicine, food and relief supplies stop moving, and a district can be cut off by the failure of one slope.

The scarce resource is not fuel or time. It is **connectivity itself**.

## The approach

The platform is built around one idea: the atomic unit is the **road segment**, and the primary intelligence is **segment survivability** — will this corridor still be passable, and if not, which districts lose their supply route?

Every module is a different question asked of that same live accessibility graph.

---

## What is actually implemented

Every item below is working against live data. Nothing in this list is a mock.

### Command centre
- **Dashboard** — nine KPI cards from a single reactive query, so the numbers can never disagree with each other
- **Situation Briefing** — observations, forecasts and recommended actions kept structurally separate
- **Live Intelligence Map** — Leaflet, five toggleable layers, filters, clustering, click-to-fly
- **Alert Centre** — severity-ordered, acknowledge/resolve, duplicate suppression
- **Analytics** — time-windowed (24h/7d/30d), district intelligence, trend charts, operational health score

### Intelligence engines
- **Risk engine** — six weighted factors capped to sum to exactly 100, every point attributable with a plain-language reason. Not a trained model, and the UI says so
- **Route intelligence** — Dijkstra over a weighted corridor graph; blocked segments removed from the graph rather than penalised
- **Fleet exposure** — proximity-based vehicle risk with per-reason explanations
- **Decision insights & recommendations** — deterministic detectors over real data
- **Operations Assistant** — deterministic intent matching, with an optional LLM layer over the same grounded context

### Field operations
- **Mobile-first `/field` interface** — large touch targets, one column, installable as a PWA
- **Incident reporting** — real Convex mutation, real file storage for photographs
- **Location capture** — single GPS fix with permission and accuracy handling
- **Draft preservation** — reports survive a dropped connection or closed browser

### Demo
- **Six-step simulation console** — every action writes to Convex through real mutations; open a second browser window and both update together

---

## Technology

| Layer | Choice |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui (Base UI) |
| Backend & database | **Convex** — queries, mutations, actions, file storage |
| Real-time | Convex reactive queries (no polling, no custom WebSocket server) |
| Maps | Leaflet + react-leaflet, CARTO dark basemap (no API key) |
| AI (optional) | Anthropic SDK, or any OpenAI-compatible endpoint |

Convex is the only backend. There is no PostgreSQL, Redis, FastAPI, Express or custom WebSocket server anywhere in the project.

## Architecture

```
Field Officer / Operator
          │
          ▼
   Next.js (App Router)
          │  reactive queries + mutations
          ▼
        Convex
          │
          ├── Risk engine        (six weighted factors → 0-100, explainable)
          ├── Route engine       (Dijkstra over the corridor graph)
          ├── Fleet exposure     (proximity-based vehicle risk)
          ├── Analytics engine   (health score, district intelligence, trends)
          └── AI layer           (bounded context → LLM → validated response)
                                  falls back to the rule engine
          │
          ▼
  Real-time Command Centre
```

The cascade that ties it together: a field report changes a road, which re-scores risk, which invalidates routes, which flags vehicles, which raises alerts, which moves the dashboard — all from one mutation, with no push code anywhere.

---

## Local setup

### Prerequisites
- Node.js 20+ (developed on 24)
- A Convex account (free)

### Install

```bash
git clone https://github.com/kalakonda-akshay/sih2k26.git
cd sih2k26
npm install
```

### Connect Convex

```bash
npx convex dev
```

This links your deployment, generates `convex/_generated/`, pushes the schema, and writes `NEXT_PUBLIC_CONVEX_URL` into `.env.local`. Leave it running.

### Run the app

```bash
npm run dev
```

Open <http://localhost:3000>. Then open the **Demo Simulation** console (bottom-right) and click **Load demo data**.

### Environment variables

| Variable | Where | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Yes | Convex deployment URL. Written by `npx convex dev`. Public by design |
| `CONVEX_DEPLOYMENT` | `.env.local` | Yes | Written by `npx convex dev` |
| `ANTHROPIC_API_KEY` | Convex env | No | Enables the LLM layer. `npx convex env set ANTHROPIC_API_KEY sk-ant-...` |
| `AI_PROVIDER` | Convex env | No | `anthropic` · `openai` · `none` |
| `AI_MODEL` | Convex env | No | Defaults to `claude-opus-5` |
| `AI_BASE_URL` | Convex env | No | For OpenAI-compatible or self-hosted endpoints |

**No secret is ever read in the browser.** AI keys live in Convex environment variables and are only read inside a server-side action. `.env*` is gitignored.

Without an AI key the platform is fully functional — the assistant runs on its deterministic engine.

---

## Demo script

The console at the bottom-right of the dashboard drives the whole scenario. Steps write real data.

| Step | Action | What to point at |
|---|---|---|
| 0 | **Load demo data** | 30 corridors, 18 vehicles, 8 states |
| 1 | **Start vehicle movement** | Markers move; open a second window to show both updating |
| 2 | **Heavy rainfall at Nongpoh** | Risk score climbs, confidence rises with fresher data |
| 3 | **Run full risk assessment** | 31 locations scored; open the explainability panel |
| 4 | **Escalate risk on NH-6** | Corridor crosses a band, alert raised |
| 5 | **Trigger landslide incident** | Road blocks, routes invalidate, vehicles flagged, dashboard moves |
| 6 | **Detect route disruptions** | Alternative corridor computed and recommended |
| — | **Reset scenario** | Returns to baseline for the next run |

Then open **Operations Assistant** and ask *"What should we prioritise?"*

For the field demo, open `/field` on a phone-sized viewport and file a report — it appears in the command centre immediately.

---

## Honest limitations

Stated plainly, because a system used by authorities should be auditable.

**The risk engine is a transparent weighted rule engine, not a trained ML model.** There is no public per-segment road-closure dataset for the NER, and fabricating one to claim "machine learning" would be dishonest. Terrain and flood indices are documented static baselines pending DEM and CWC integration. `calculateOverallRisk` is a pure function from a feature vector to a scored result — a Python service replaces exactly that one call.

**Route intelligence is corridor-level path selection, not turn-by-turn navigation.** The graph has tens of nodes and each edge is an entire highway between towns. It answers "which corridors should this consignment use", never "turn left in 200 metres". No travel times are computed, because there is no speed data to derive honest ones from.

**Sikkim is unroutable from the mainland network** — correctly. It connects to India via Siliguri in West Bengal, outside the monitored region.

**Vehicle exposure uses straight-line distance, not road-network distance.** It deliberately over-triggers: a false flag is cheap, a missed vehicle driving into a closed corridor is not.

**Offline support is limited and does not claim otherwise.** Convex mutations do not queue and replay offline. Drafts are preserved locally and restored; a report is only ever shown as sent once the mutation returns an id.

**The PWA manifest provides installability, not offline caching.** There is no service worker.

**Authentication is not implemented.** The schema carries `tokenIdentifier` and role fields so a provider drops in without migration, but there is currently no login.

**Road geometry is representative demonstration data**, built on real NH designations and real district-headquarter coordinates, not a surveyed government network.

---

## Verification

```bash
npx tsc --noEmit      # type checking
npx eslint src convex # linting
npm run build         # production build
```

---

## Licence

Built for Smart India Hackathon 2026. Not affiliated with MDoNER.
