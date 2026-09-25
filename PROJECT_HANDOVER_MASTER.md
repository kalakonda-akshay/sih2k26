# NER-Vision AI — Master Technical Handover & System Specification

> **Platform**: Logistics & Accessibility Command Centre for Northeast India  
> **Hackathon Reference**: SIH26002 · Ministry of Development of North Eastern Region (MDoNER)  
> **Production Live URL**: `https://sih2k26-one.vercel.app`  
> **Active Convex Backend**: `dev:quiet-raven-374` (`https://quiet-raven-374.convex.cloud`)  
> **Admin Account**: `akshaykalakonda9@gmail.com` | Password: `Ram@6002`  
> **Target Audience**: AI Models (ChatGPT, Claude), Core Developers, and SIH Evaluation Panel  

---

## 1. Executive Summary & Problem Context

### 1.1 The Operational Challenge in Northeast India (NER)
The eight North Eastern states (Assam, Arunachal Pradesh, Meghalaya, Manipur, Mizoram, Nagaland, Sikkim, Tripura) face severe logistical and physical isolation challenges:
- **Geographic Vulnerabilities**: Extreme hill gradients, narrow mountain gorges, tectonic instability, and the infamous "Siliguri Corridor" bottleneck.
- **Monsoon Hazards**: Frequent landslides, rockfalls, flash floods, and bridge washouts paralyze national highways (NH-27, NH-6, NH-13 Trans-Arunachal Highway).
- **Communication Blackouts**: High mountain valleys lose 4G/cellular connectivity during disasters, preventing field teams from reporting blockages or requesting relief.
- **Relief Delay**: Critical supplies (medical oxygen, emergency rations, heavy road-clearing machinery) are delayed due to lack of dynamic re-routing and unified multi-agency situational awareness.

### 1.2 The Solution: NER-Vision AI
**NER-Vision AI** is a real-time accessibility, logistics, and disruption intelligence platform developed under MDoNER guidelines. It provides:
1. Unified GIS situational awareness across all 8 states with multi-basemap satellite & topographic layers.
2. Real-time fleet tracking with hazard alerts and dynamic route diversion.
3. Offline-first field incident reporting utilizing browser IndexedDB to eliminate data loss during network outages.
4. Edge AI computer vision for instant on-device landslide damage assessment.
5. Automated emergency broadcast via Fast2SMS with zero-cost simulation safeguards.
6. Automated MDoNER Situation Report (SitRep) PDF generation for high-level administration.

---

## 2. System Architecture & Tech Stack

```mermaid
graph TD
    Client["Client Browser (PWA) / Field Officer / Commander"]
    VercelEdge["Vercel Edge & Serverless (Next.js 16.3.4 App Router)"]
    Proxy["src/proxy.ts (Auth Cookie & Route Protection)"]
    ConvexBackend["Convex Cloud (quiet-raven-374.convex.cloud)"]
    AuthTables["Convex Auth (JWT + Password Provider)"]
    LiveDatabase["Real-time Reactive DB (Roads, Routes, Incidents, Fleet)"]
    Fast2SMS["Fast2SMS DLT Gateway (India)"]
    IndexedDB["Local Device IndexedDB (ner-vision-offline)"]

    Client -->|HTTPS / WebSocket| VercelEdge
    VercelEdge -->|Proxy & Cookie Validation| Proxy
    Proxy -->|Authenticated Sessions| ConvexBackend
    Client -->|Direct Reactive WebSocket| LiveDatabase
    Client -->|Offline Storage during blackout| IndexedDB
    IndexedDB -->|Auto-Sync Replay on reconnect| ConvexBackend
    ConvexBackend --> AuthTables
    ConvexBackend --> LiveDatabase
    VercelEdge -->|Emergency SMS API| Fast2SMS
```

### Detailed Tech Stack Matrix
| Layer | Technologies Used | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.4 (App Router, Turbopack, React 19) | Fast builds, server components, Next.js 16 Proxy conventions. |
| **Styling & UI** | Tailwind CSS v4, Lucide React, Base UI / Radix primitives | High-contrast dark tactical command aesthetic. |
| **Database & Backend** | Convex 1.45.0 (`quiet-raven-374`) | Real-time reactive subscriptions, zero cold-starts, WebSocket live updates. |
| **Authentication** | `@convex-dev/auth` 0.0.95 + `@auth/core` | Password hashing (PBKDF2/scrypt), JWT signed tokens, secure HTTP-only cookies. |
| **GIS & Mapping** | Leaflet 1.9.4, React-Leaflet, ArcGIS Tile Services | Dark tactical, high-res satellite, and topographic relief maps with zero API fees. |
| **Edge AI Vision** | HTML5 Canvas Computer Vision Engine | On-device Sobel contour & rockfall density scoring; 100% offline, ₹0 cost. |
| **Offline Storage** | HTML5 IndexedDB API (`ner-vision-offline`) | Preserves multi-megabyte photo blobs and reports across device reboots. |
| **SMS Gateway** | Fast2SMS REST API v3.8 | Quick-Alert dispatch to district collectors and drivers across India. |
| **Reporting** | jsPDF + jspdf-autotable | Generates official MDoNER Situation Reports formatted for government protocols. |
| **Voice AI** | Native Browser Web Speech API | Speech recognition for Indian English & Hindi without third-party paid models. |
| **Localization** | `react-i18next` + `i18next` | 12 languages supported (English, Hindi, and 10 North Eastern regional dialects). |

---

## 3. Credentials, URLs & Configuration

### Environment Variables (`.env.local` & Vercel Production)
```env
# Active Convex Backend Deployment
CONVEX_DEPLOYMENT=dev:quiet-raven-374
NEXT_PUBLIC_CONVEX_URL=https://quiet-raven-374.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://quiet-raven-374.convex.site

# Convex Deploy Key (for CLI deployments & migrations)
CONVEX_DEPLOY_KEY=dev:quiet-raven-374|eyJ2MiI6IjYyOTE2YzU4NWY3ZjQ0NzE4NDRlMDM3Y2JkNGQzZjdjIn0=

# Convex Auth Private Signing Key (RSA 2048-bit PKCS#8)
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDs9XEQa4Ai7kAz\n...[Stored securely in Convex and .env.local]...==\n-----END PRIVATE KEY-----\n"

# Fast2SMS Verified Production API Key (Balance: ₹50.00 / 200 SMS)
FAST2SMS_API_KEY=uSNFzrHsLMl0iDdOB1nRm4QKk5yZbwfTCe6qWxA9Ig7hG2VpJo9Ta7ZIp0dxgRVctbjzLEvYG4FUkKQ2
```

### Verified User Accounts
| Email | Password | Role | Permissions |
| :--- | :--- | :--- | :--- |
| `akshaykalakonda9@gmail.com` | `Ram@6002` | `admin` | Full System Access (MDoNER Regional Commander) |
| `admin@nervision.gov.in` | Seeded Demo | `admin` | Master Administrative Access |
| `operator@nervision.gov.in` | Seeded Demo | `logistics_operator` | Fleet Dispatch & Route Planning |
| `field.eastkameng@nervision.gov.in` | Seeded Demo | `field_officer` | Incident Logging & Drone Inspection |
| `emergency@nervision.gov.in` | Seeded Demo | `emergency_authority` | Disaster Alerts & SitRep Exports |

---

## 4. Database Schema Specification (`convex/schema.ts`)

The backend schema spread includes Convex Auth default tables (`authTables`) along with 10 custom domain models:

### 4.1 `users`
- `email`: `v.optional(v.string())` (Indexed: `email`, `by_email`)
- `name`: `v.optional(v.string())`
- `role`: `userRole` (`admin`, `logistics_operator`, `field_officer`, `emergency_authority`) (Indexed: `by_role`, `by_role_and_isActive`)
- `organization`: `v.optional(v.string())`
- `phone`: `v.optional(v.string())`
- `district`, `state`: `v.optional(v.string())`
- `isActive`: `v.optional(v.boolean())`
- `createdAt`, `updatedAt`: `v.optional(v.number())`

### 4.2 `roads` (Highway & Corridor Segments)
- `roadNumber`: `v.string()` (e.g., "NH-27", "NH-6", "NH-13") (Indexed: `by_roadNumber`)
- `name`: `v.string()`
- `state`: `stateValidator` (Indexed: `by_state`, `by_state_and_district`)
- `district`: `v.string()`
- `startNode`, `endNode`: `v.string()` (Indexed: `by_startNode`, `by_endNode`)
- `startLatitude`, `startLongitude`, `endLatitude`, `endLongitude`: `v.number()`
- `lengthKm`: `v.number()`
- `accessibilityStatus`: `accessibilityStatus` (`accessible`, `restricted`, `blocked`) (Indexed: `by_accessibilityStatus`)
- `riskLevel`: `riskLevel` (`low`, `medium`, `high`, `critical`) (Indexed: `by_riskLevel`)
- `riskScore`: `v.number()` (0 to 100)
- `slopeGradient`: `v.number()` (Degrees)
- `geometry`: `v.optional(v.object({ type: v.literal("LineString"), coordinates: v.array(v.array(v.number())) }))`

### 4.3 `vehicles` (Tactical Fleet & Convoys)
- `vehicleNumber`: `v.string()` (Indexed: `by_vehicleNumber`)
- `vehicleType`: `vehicleType` (`heavy_truck`, `medium_truck`, `light_van`, `fuel_tanker`, `emergency_van`)
- `cargoType`: `cargoType` (`medical_supplies`, `perishable_food`, `dry_rations`, `fuel`, `heavy_machinery`) (Indexed: `by_cargoType`)
- `cargoWeightTons`: `v.number()`
- `latitude`, `longitude`: `v.number()`
- `heading`, `speedKmh`: `v.number()`
- `status`: `vehicleStatus` (`active`, `delayed`, `emergency`, `idle`, `offline`) (Indexed: `by_status`, `by_status_and_riskLevel`)
- `operatorId`: `v.id("users")` (Indexed: `by_operatorId`)
- `routeId`: `v.optional(v.id("routes"))`

### 4.4 `incidents` (Field Hazards & Roadblocks)
- `incidentType`: `incidentType` (`landslide`, `flooding`, `bridge_collapse`, `road_damage`, `snow_blockage`, `vehicle_accident`)
- `severity`: `severity` (`low`, `medium`, `high`, `critical`) (Indexed: `by_severity`, `by_status_and_severity`)
- `status`: `incidentStatus` (`reported`, `verified`, `in_progress`, `cleared`) (Indexed: `by_status`)
- `latitude`, `longitude`: `v.number()`
- `locationName`, `state`, `district`: `v.string()`
- `reportedBy`: `v.id("users")` (Indexed: `by_reportedBy`)
- `clientUuid`: `v.optional(v.string())` (Indexed: `by_clientUuid` for offline deduplication)
- `imageStorageId`: `v.optional(v.id("_storage"))`
- `estimatedClearanceHours`: `v.optional(v.number())`

### 4.5 `routes`
- `sourceHubId`, `destinationHubId`: `v.string()`
- `roadIds`: `v.array(v.id("roads"))`
- `totalDistanceKm`, `estimatedDurationMinutes`: `v.number()`
- `compositeRiskScore`: `v.number()`
- `routeType`: `v.union(v.literal("primary"), v.literal("contingency"), v.literal("emergency"))` (Indexed: `by_routeType`, `by_status_and_routeType`)
- `status`: `v.union(v.literal("active"), v.literal("diverted"), v.literal("suspended"))`

### 4.6 Additional Tables
- `alerts`: Emergency broadcast notifications (Indexed: `by_severity`, `by_status_and_severity`).
- `deliveries`: Supply priority manifests (Indexed: `by_priority`, `by_status_and_priority`).
- `weatherData`: Automatic meteorological stations across NER (Precipitation, wind, visibility, flood warnings).
- `riskPredictions`: Machine learning calculated vulnerability ratings per corridor.
- `activityLog`: Tamper-evident audit trail of all commands and dispatches.

---

## 5. Completed Upgrades & Technical Architecture

### 5.1 Upgrade A: Fast2SMS Emergency Alert Dispatch
- **Files**:
  - `src/app/api/sms/send/route.ts`: Serverless route calling `https://www.fast2sms.com/dev/bulkV2`.
  - `src/app/api/sms/balance/route.ts`: Balance check endpoint.
  - `src/components/emergency/sms-automation-panel.tsx`: Command UI.
- **Cost Protection**: Default **Simulation Mode** toggle prevents accidental debit from verified balance (₹50.00 / 200 SMS).
- **Functionality**: Dispatches incident coordinates, severity, and detour instructions directly to mobile phones.

### 5.2 Upgrade B: Edge AI Landslide & Damage Vision Analyzer
- **Files**:
  - `src/components/ai/damage-vision-analyzer.tsx`: On-device Computer Vision component.
  - `src/components/field/incident-report-form.tsx`: Integrated field capture form.
- **Algorithm**:
  - HTML5 Canvas extraction of 2D pixel buffer.
  - 3x3 Sobel kernel gradient convolution for edge/fracture detection.
  - HSV color segmentation for mud, debris, and rock mass ratio.
  - Outputs Hazard Severity (`CRITICAL`, `HIGH`, `MEDIUM`), estimated blockage volume in cubic meters, and road clearance recommendation without requiring cloud GPU APIs.

### 5.3 Upgrade C: Official MDoNER Situation Report (SitRep) PDF
- **Files**:
  - `src/components/reports/sitrep-modal.tsx`: PDF generator using `jspdf` and `jspdf-autotable`.
  - `src/components/layout/documents-menu.tsx`: Navbar integration.
- **Formatting**:
  - Official MDoNER Government of India header banner.
  - Executive summary metrics (Active blockages, network accessibility %, critical convoys).
  - High-risk corridor tables with bypass recommendations.
  - Print-ready and downloadable directly on client devices.

### 5.4 Upgrade D: Multi-Tier RBAC Role Switcher
- **Files**:
  - `src/components/layout/role-switcher.tsx`: Role dropdown.
  - `src/components/layout/top-navbar.tsx`: Header wiring.
- **Roles**:
  - `admin`: All capabilities, system seeding, SMS config.
  - `logistics_operator`: Convoy routing, vehicle assignment, speed override.
  - `field_officer`: Incident reporting, drone uploads, offline mesh.
  - `emergency_authority`: Red alerts, siren activation, SitRep exports.

### 5.5 Upgrade E: Voice AI Operations Assistant
- **Files**:
  - `src/components/assistant/assistant-chat.tsx`: Real-time chat & voice interface.
- **Capabilities**:
  - Native Web Speech API integration.
  - Indian English & Hindi command voice recognition.
  - Voice-driven map queries: *"Show landslides in Sikkim"*, *"Find alternate route to Tawang"*, *"Check network status"*.

### 5.6 Upgrade F: Offline-First Field Incident Sync (IndexedDB Mesh)
- **Files**:
  - `src/lib/offline-queue.ts`: IndexedDB database manager (`ner-vision-offline`).
  - `src/components/field/use-offline-queue.ts`: Queue synchronization hook.
  - `src/components/offline/offline-sync-indicator.tsx`: Top navbar status pill and slide-over inspector drawer.
- **Guarantees**:
  - Durable persistence of incident drafts and photo Blobs during complete mountain signal loss.
  - Auto-replays queued reports with idempotency keys (`clientUuid`) when connectivity returns.
  - "Simulate Cut-Off" mode for interactive judge evaluation.

### 5.7 Upgrade G: Live Convoy Simulation & Dynamic Geo-Fencing
- **Files**:
  - `src/components/map/convoy-types.ts`: Pure mathematical waypoint interpolation and distance calculation (100% SSR-safe).
  - `src/components/map/layers/convoy-simulation-layer.tsx`: Leaflet rendering layer for moving convoys, trails, radar hazard circles, and alternate bypasses.
  - `src/components/map/convoy-simulator-hud.tsx`: Floating tactical control dock on the map.
  - `src/components/map/intelligence-map.tsx`: Main map container integration.
- **Pre-Configured Convoys**:
  - **Convoy Alpha (MDoNER Medical & Oxygen Relief)**: *Guwahati ➔ Shillong ➔ Jowai ➔ Sonapur Mudslide Zone ➔ Silchar*.
  - **Convoy Bravo (BRO Heavy Excavators)**: *Tezpur ➔ Bhalukpong ➔ Bomdila ➔ Sela Pass (4,170m)*.
  - **Convoy Charlie (NDRF Emergency Rations)**: *Dimapur ➔ Kohima ➔ Mao Gate ➔ Imphal*.
- **Features**:
  - Live animated vehicle marker with directional heading rotation.
  - Real-time distance calculation to active hazard zones.
  - Audio siren chime synthesized via Web Audio API when breaching hazard radius.
  - Dynamic **"Engage Emergency Diversion By-Pass"** button dynamically re-routing the convoy along safe valley bypasses.

---

## 6. Routing, Middleware & Next.js 16 File Conventions

### Next.js 16 Proxy Architecture (`src/proxy.ts`)
Next.js 16 replaces `middleware.ts` with `proxy.ts`. 

```typescript
// Excerpt from src/proxy.ts
export default convexAuthNextjsMiddleware(async (request: NextRequest) => {
  // Read secure HTTP-only cookie
  const token =
    request.cookies.get("__Host-__convexAuthJWT")?.value ||
    request.cookies.get("__convexAuthJWT")?.value;
  const isAuthed = Boolean(token && token.trim().length > 20);

  const pathname = request.nextUrl.pathname;

  // Root path: redirect to dashboard if logged in, otherwise to login
  if (pathname === "/") {
    return nextjsMiddlewareRedirect(request, isAuthed ? "/dashboard" : "/login");
  }

  // Redirect unauthenticated users away from protected pages
  if (!isPublicRoute(request) && !isAuthed) {
    return nextjsMiddlewareRedirect(request, "/login");
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute(request) && isAuthed) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
});
```

### Route Structure
- `/login`: Public auth page with password reveal and generic failure messages.
- `/signup`: Public account creation page attaching default profile upon creation.
- `/forgot-password`: Stub reset page with admin contact advice.
- `/dashboard`: Operations command center (Protected).
- `/map`: Full tactical GIS command map (Protected).
- `/incidents`: Incident management & verification desk (Protected).
- `/deliveries`: Supply dispatch and convoy planner (Protected).
- `/field`: Field officer reporting suite with AI vision & offline draft store (Protected).
- `/emergency`: Fast2SMS broadcast automation suite (Protected).
- `/risk-intelligence`: Machine learning corridor vulnerability predictor (Protected).
- `/analytics`: Regional accessibility and weather impact charts (Protected).
- `/settings`: System configuration and language selection (Protected).

---

## 7. Instructions for ChatGPT & Claude Handover

If continuing this project in a new session with **ChatGPT** or **Claude**, use the following prompt:

```text
You are continuing development on "NER-Vision AI", a Smart India Hackathon (SIH26002) Command Centre for the Ministry of Development of North Eastern Region (MDoNER).

Project Summary:
- Tech Stack: Next.js 16.3.4 (App Router), Convex 1.45.0, Tailwind CSS v4, Leaflet.
- Active Convex Deployment: dev:quiet-raven-374 (https://quiet-raven-374.convex.cloud).
- Live Vercel Production: https://sih2k26-one.vercel.app.
- Admin Login: akshaykalakonda9@gmail.com / Ram@6002.
- Authentication: Convex Auth with Password Provider and Next.js 16 proxy.ts cookie checks.
- Completed Features:
  1. Fast2SMS emergency alert dispatch with simulation mode protection.
  2. Edge AI Landslide Vision analyzer using HTML5 Canvas.
  3. MDoNER SitRep PDF export via jsPDF.
  4. Multi-tier RBAC switcher (Admin, Logistics Operator, Field Officer, Emergency Authority).
  5. Voice AI Assistant in Indian English and Hindi via Web Speech API.
  6. Offline-first Field Incident Sync with IndexedDB and navbar status pill.
  7. Live Convoy Simulation with Web Audio geo-fencing siren and dynamic bypass diversion.

Read the attached PROJECT_HANDOVER_MASTER.md document for exact database schema, API signatures, and file paths. Preserve all existing zero-cost constraints and adhere strictly to Next.js 16 proxy conventions.
```

---
*Generated by Antigravity AI Engineering Suite · 2026*
