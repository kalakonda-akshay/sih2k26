# Documentation

Two standalone HTML documents. Open either in a browser — no build step, no
dependencies. To produce a PDF, open it and print to PDF (Ctrl/Cmd + P); the
layout is set up for it.

| File | What it is |
|---|---|
| `technical-report.html` | The delivered system: stack, architecture, all 17 algorithms, data model, real-time design, an honest offline assessment, and 12 prepared judge questions with answers. |
| `architecture-blueprint.html` | The original Phase-1 architecture study — product vision, MVP scope, database design, API surface, ML and GIS architecture, and the phased build plan. |

**A note on the blueprint.** It was written before implementation and specifies a
PostgreSQL + PostGIS + FastAPI backend. That was deliberately superseded by
Convex, which removed roughly four moving parts from the deployment. The
blueprint is kept as-is because the problem analysis, the risk model and the
corridor-survivability framing all carried through unchanged — only the backend
choice did not. `technical-report.html` describes what was actually built.
