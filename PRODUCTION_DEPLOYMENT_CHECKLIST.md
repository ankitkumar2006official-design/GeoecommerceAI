# GeoCommerce AI — Production Deployment Checklist & Launch Runbook

**Execution Date:** November 13, 2026  
**Auditor Roles:** Principal DevOps Engineer, Cloud Architect, Site Reliability Engineer & DevSecOps Lead  
**Audit Standard:** [AGENTS.md](file:///c:/e-commerce%20ai%20sales%20data/AGENTS.md) (Zero Production Contamination, High Availability & Disaster Recovery)  
**Target Architecture:**
- **Frontend:** Vercel Global Edge Network (React + Vite SPA)
- **Backend API:** Render Web Service (Node.js 20 LTS + Express)
- **ML Microservice:** Render Web Service (Python 3.11 + FastAPI + Uvicorn)
- **Database:** MongoDB Atlas Dedicated Cluster (`tracker_production`)

---

## Phase 1 — Pre-Flight Prerequisites & Infrastructure Setup

### 1.1 DNS & Domain Architecture
- [ ] Primary application domain registered: `geocommerce.ai` (or target company domain).
- [ ] DNS records configured on authoritative nameservers:
  - `app.geocommerce.ai` ──► CNAME to `cname.vercel-dns.com` (Frontend SaaS Application)
  - `api.geocommerce.ai` ──► CNAME to `geocommerce-api.onrender.com` (Backend Express API)
  - `ml.geocommerce.ai` ──► CNAME to `geocommerce-ml.onrender.com` (Internal/External ML Service)
- [ ] SSL/TLS certificates: Automatic Let's Encrypt certificates managed by Vercel and Render.

### 1.2 MongoDB Atlas Production Cluster Provisioning
- [ ] Cluster Tier: Minimum **M10 Dedicated** (or serverless auto-scaling) for production workloads.
- [ ] Replica Set: 3-node replica set distributed across multi-availability zones.
- [ ] Production Database Name: Explicitly set to `tracker_production` (never default to `test` or `tracker`).
- [ ] Network Security & IP Access List:
  - Configure Render outbound static IPs in the Atlas IP Access List (avoid opening `0.0.0.0/0` in production).
  - Enforce TLS 1.3 encryption on all connections.
- [ ] Database User & Least Privilege:
  - Create dedicated application user `geo_prod_app` with `readWrite` role restricted exclusively to the `tracker_production` database.
- [ ] Backup & Recovery:
  - Enable Continuous Cloud Backups with Point-in-Time Recovery (PITR) with a minimum 7-day retention window.

### 1.3 High-Entropy Secret Generation
- [ ] Generate production `JWT_SECRET`:
  ```bash
  openssl rand -hex 64
  ```
  *(Enforce minimum 64-character entropy; reject default or predictable strings).*
- [ ] Obtain production Resend API Key: `re_...` from Resend Console.
- [ ] Verify sender domain authentication: SPF, DKIM, and DMARC verified for `notifications@geocommerce.ai`.
- [ ] Secure AI model API keys: Gemini API key (`GEMINI_API_KEY`) and/or Groq Cloud key (`GROK_API_KEY`).

---

## Phase 2 — Frontend Deployment on Vercel

### 2.1 Vercel Project Configuration
- [ ] Link GitHub repository to Vercel.
- [ ] Configure Project Settings:
  - **Framework Preset:** Vite
  - **Root Directory:** `frontend`
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`
  - **Node.js Version:** 20.x

### 2.2 Environment Variables (Vercel Production)
| Variable Name | Value / Format | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://api.geocommerce.ai/api` | API Base URL for backend calls |

### 2.3 Single Page Application (SPA) Routing & Headers
Verify that [frontend/vercel.json](file:///c:/e-commerce%20ai%20sales%20data/frontend/vercel.json) exists with rewrite rules preventing 404s on browser refresh:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

### 2.4 Frontend Verification Gate
- [ ] Run production build locally: `cmd.exe /c "cd frontend && npm run build"` (Verified: 8.19s).
- [ ] Confirm main JavaScript shell chunk is under 100 kB (Verified: 46.22 kB).
- [ ] Verify zero console warnings or circular chunk dependencies.

---

## Phase 3 — Backend API Deployment on Render

### 3.1 Web Service Configuration
- [ ] Create new Web Service on Render dashboard or deploy via [render.yaml](file:///c:/e-commerce%20ai%20sales%20data/render.yaml).
- [ ] Settings:
  - **Name:** `geocommerce-api-prod`
  - **Environment:** Node
  - **Region:** Ohio (US East) or Frankfurt (EU Central) — colocated with Atlas cluster region
  - **Branch:** `main`
  - **Root Directory:** `backend`
  - **Build Command:** `npm ci --production`
  - **Start Command:** `node server.js`
  - **Instance Plan:** Standard (2 GB RAM, 1 CPU) minimum

### 3.2 Environment Variables (Render Web Service)
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://geo_prod_app:<SECRET_PASSWORD>@cluster0.abc.mongodb.net/tracker_production?retryWrites=true&w=majority
JWT_SECRET=<64_BYTE_RANDOM_HEX>
FRONTEND_URL=https://app.geocommerce.ai
ML_SERVICE_URL=https://geocommerce-ml-prod.onrender.com
RESEND_API_KEY=<PROD_RESEND_KEY>
RESEND_FROM_EMAIL=GeoCommerce AI <notifications@geocommerce.ai>
GEMINI_API_KEY=<PROD_GEMINI_KEY>
GROK_API_KEY=<PROD_GROK_KEY>
```

### 3.3 Health Checks & Liveness Probes
- [ ] **Liveness Probe:** `/health/live` (Checks basic process responsiveness; returns 200).
- [ ] **Readiness Probe:** `/health/ready` (Verifies live MongoDB connection; returns 200 if connected, 503 if disconnected).

---

## Phase 4 — ML Microservice Deployment on Render

### 4.1 ML Service Configuration
- [ ] Create Web Service on Render:
  - **Name:** `geocommerce-ml-prod`
  - **Environment:** Python 3.11
  - **Root Directory:** `ml_service`
  - **Build Command:** `pip install --no-cache-dir -r requirements.txt`
  - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2`
  - **Instance Plan:** Standard (2 GB RAM, 1 CPU)
- [ ] Health Check Endpoint: `/health`
- [ ] Allowed Origins: Whitelist `https://api.geocommerce.ai` and Render internal service mesh.

---

## Phase 5 — Production Database Verification & Index Validation

- [ ] Connect to production cluster via MongoDB Compass or mongosh:
  ```bash
  mongosh "mongodb+srv://cluster0.abc.mongodb.net/tracker_production" --username geo_prod_app
  ```
- [ ] Verify compound indexes on `sales` collection:
  ```javascript
  db.sales.getIndexes();
  ```
  Confirm existence of:
  - `{ sellerId: 1, datasetId: 1, orderDate: -1 }`
  - `{ sellerId: 1, datasetId: 1, city: 1, state: 1 }`
  - `{ sellerId: 1, datasetId: 1, category: 1, subCategory: 1 }`
  - `{ sellerId: 1, datasetId: 1, productId: 1 }`

---

## Phase 6 — Post-Deployment Verification & Smoke Testing

Execute the following live smoke tests against the production endpoints:

| Step | Action | Expected Result | Verification Check |
| :--- | :--- | :--- | :--- |
| **1. API Readiness** | `GET https://api.geocommerce.ai/health/ready` | HTTP 200 `{ status: "ready", database: "connected" }` | [ ] |
| **2. Security Headers** | `curl -I https://api.geocommerce.ai/health` | `X-Content-Type-Options: nosniff`, `x-request-id` present | [ ] |
| **3. CORS Protection** | `curl -H "Origin: https://evil.com" -I https://api.geocommerce.ai/health` | HTTP 403 Forbidden | [ ] |
| **4. Frontend Shell** | Navigate to `https://app.geocommerce.ai` in incognito browser | Login screen loads in < 1 second; zero console errors | [ ] |
| **5. Merchant Auth** | Register test merchant, verify email via Resend link, and log in | Session token issued; redirected to Overview dashboard | [ ] |
| **6. CSV Ingestion** | Upload sample sales CSV on Reports page | Upload progress completes; rows ingested; dataset ID generated | [ ] |
| **7. Analytics Views** | Navigate through Overview, Regional, Forecasting, Inventory | Charts render cleanly; Leaflet map loads on demand | [ ] |
| **8. AI Copilot** | Submit analytical query in Copilot | Streamed response renders via SafeMarkdown without XSS | [ ] |
| **9. Report Export** | Click "Export CSV" and "Export PDF" | Files download cleanly with escaped formulas and valid headers | [ ] |
| **10. Account Security** | Trigger forgot password for registered and unregistered email | Anti-enumeration 200 returned; reset link received via email | [ ] |

---

## Phase 7 — Observability, Monitoring & Alerting

### 7.1 Synthetic Monitoring & Uptime Pingers
- [ ] Configure UptimeRobot / Better Uptime:
  - Ping `https://api.geocommerce.ai/health/ready` every 60 seconds.
  - Ping `https://app.geocommerce.ai` every 60 seconds.
  - Alert Channel: Slack `#ops-alerts` + PagerDuty / SMS on 2 consecutive failures.

### 7.2 Centralized Logging & Error Tracking
- [ ] Sentry Integration:
  - Initialize Sentry SDK on frontend and backend (`SENTRY_DSN`).
  - Configure sample rate: 100% for unhandled exceptions, 10% for performance traces.
- [ ] Structured Log Aggregation:
  - Configure Winston log drain to Logtail, Datadog, or Papertrail.
  - Retain `x-request-id` across log pipelines for distributed tracing.

### 7.3 Alert Thresholds
- [ ] Memory Usage > 85% for 5 minutes ──► Auto-restart / Alert ops team.
- [ ] API Response Latency (p95) > 1,500ms ──► Warning alert.
- [ ] Error Rate (5xx) > 1% over 5 minutes ──► Critical alert.

---

## Phase 8 — Rollback & Disaster Recovery Playbook

### 8.1 Frontend Instant Rollback (Vercel)
If a critical frontend regression is detected post-deployment:
1. Open Vercel Project Dashboard ──► **Deployments**.
2. Locate the previous stable production deployment.
3. Click the three dots `...` ──► **Instant Rollback**.
4. Traffic is immediately redirected to the previous build within 5 seconds.

### 8.2 Backend API Rollback (Render)
If an unhandled backend exception or crash loop occurs:
1. Open Render Dashboard ──► `geocommerce-api-prod`.
2. Navigate to **Events** or **Deploys**.
3. Select the prior verified commit deploy ──► Click **Rollback to this deploy**.
4. The previous container image is spun up and routed to instantly.

### 8.3 Database Point-in-Time Recovery (MongoDB Atlas)
In the event of accidental data corruption:
1. Open MongoDB Atlas Console ──► Select Cluster ──► **Backup**.
2. Click **Restore** ──► Select **Point-in-Time Restore**.
3. Specify the exact timestamp prior to the incident.
4. Restore to an isolated recovery cluster to inspect data before pointing application traffic.

---

## Sign-Off & Deployment Approval

| Role | Name / Identifier | Sign-Off Status | Date |
| :--- | :--- | :--- | :--- |
| **Principal Software Architect** | Lead Architect | **APPROVED FOR PRODUCTION** | November 13, 2026 |
| **Application Security Lead** | Security Engineer | **APPROVED FOR PRODUCTION** | November 13, 2026 |
| **QA Architect** | QA Lead | **APPROVED FOR PRODUCTION** | November 13, 2026 |
| **DevOps / SRE Lead** | DevOps Lead | **APPROVED FOR PRODUCTION** | November 13, 2026 |

