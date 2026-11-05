# GeoCommerce AI 🇮🇳
### AI-Powered Regional E-Commerce Demand Intelligence & Predictive Analytics Platform

GeoCommerce AI is an enterprise-grade SaaS intelligence platform engineered for multi-channel Indian e-commerce sellers (Amazon, Flipkart, Meesho, Shopify). It transforms raw order transactions into granular geographical business intelligence, machine learning demand forecasts, explainable market opportunity scores, inventory stockout safeguards, and conversational AI insights.

---

## 🌟 Key Functional Modules

1. **Seller Authentication & Tenant Isolation**: Secure registration, login, bcrypt password hashing, and JWT authorization ensuring zero data leakage across merchants.
2. **Flexible Sales Data Ingestion**: Drag-and-drop CSV and Excel (.xlsx) parser with canonical column mapping, duplicate detection, data integrity validation, and detailed rejection reporting.
3. **Regional Demand Analytics**: Demand aggregation across Indian **States, Districts, Cities, and PIN codes**, surfacing top products by units and revenue.
4. **Interactive Leaflet India Demand Heatmap**: Geospatial map rendering verified PIN code delivery clusters, scalable intensity markers, and localized popup analytics.
5. **Machine Learning Demand Forecasting**: Multi-horizon (7-day, 30-day, 90-day) gradient boosted time-series predictions with lag features, calendar seasonality, moving averages, confidence intervals, and baseline RMSE benchmarks.
6. **AI Regional Opportunity Scoring**: Explainable multi-factor scoring model ($0-100$) evaluating demand velocity, margin, consistency, coverage, and return quality.
7. **Smart Inventory Optimization**: Statistically calculated Safety Stock ($SS = Z \cdot \sigma_d \cdot \sqrt{L}$), Reorder Points ($ROP$), stockout warnings, and inter-hub inventory transfer suggestions.
8. **Market Supply Gap Detector**: Identifies geographical customer demand surges where seller inventory is critically under-allocated.
9. **Dead Stock Prevention**: Evaluates inventory dormancy, days inactive, and capital at risk with actionable clearance and bundling strategies.
10. **Pricing Intelligence & Elasticity Simulator**: Empirical and microeconomic price elasticity curves with interactive -20% to +20% pricing sliders and profit maximization points.
11. **Marketing ROI & Campaign Allocation**: Regional ROAS, customer acquisition costs (CAC), and marketing capital optimization.
12. **Product Bundle Discovery (Apriori Algorithm)**: Association rule mining on order baskets discovering high-lift product bundles with Support, Confidence, and Lift metrics.
13. **Warehouse Location Advisor**: K-Means clustering and demand-weighted centroid optimization minimizing ton-km delivery distances and courier freight costs.
14. **AI Business Copilot**: Conversational executive assistant powered by Gemini API with structured tool-calling, strictly grounded in verified database analytics.
15. **What-If Business Simulator**: Interactive scenario planner for price shifts, inventory expansion, ad spend surges, and regional expansion.
16. **Executive Reports & Data Export**: Instant RFC-4180 CSV spreadsheet downloads and formatted binary PDF executive intelligence reports.

---

## 🏗️ Architecture

```
                       React 18 + Vite Frontend
                          (Tailwind CSS + Recharts + Leaflet)
                                    |
                                    v
                     Node.js / Express Backend (Port 5000)
                     ├── JWT Authentication & Multi-Tenancy
                     ├── Multer CSV / Excel Parser & Validator
                     ├── PDFKit Executive Report Generator
                     ├── In-Memory Store / MongoDB Atlas (Mongoose)
                     └── Tool-Grounded Copilot Engine
                                    |
                    +---------------+---------------+
                    |                               |
                    v                               v
         Python FastAPI ML Service             Gemini API
               (Port 8000)               (Conversational Agent)
      ├── Scikit-Learn Forecaster
      ├── Opportunity Scorer
      ├── Inventory Safety Stock Optimizer
      ├── Apriori Basket Miner
      └── Warehouse Centroid K-Means
```

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, Leaflet, React-Leaflet, Axios, React Router.
- **Backend**: Node.js, Express.js, Mongoose, MongoDB (with automatic zero-config embedded high-performance in-memory fallback), JWT, BcryptJS, Multer, XLSX, CSV-Parser, PDFKit.
- **Machine Learning**: Python 3.11, FastAPI, Uvicorn, Pandas, NumPy, Scikit-Learn, SciPy, XGBoost.
- **Generative AI**: Google Gemini API with structured tool-calling grounding.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### 2. Setup Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Setup Python ML Service
```bash
cd ml_service
pip install -r requirements.txt
python run.py
```

### 4. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

> **One-Click Instant Demo Onboarding**:
> On the dashboard or in Settings, click **"⚡ Load Demo Data"** to immediately populate your account with **1,500+ authentic Indian e-commerce transactions** across 75+ PIN codes spanning Electronics, Fashion, Home & Kitchen, Beauty, and Groceries.

---

## 🧪 Automated Testing

GeoCommerce AI includes comprehensive unit, integration, and full end-to-end workflow test suites:

```bash
# Run Backend & In-Memory Database Tests
cd backend
npm test

# Run Full E2E Workflow Test Suite
node tests/run_e2e.js
```

---

## 🌐 Production Deployment

- **Frontend**: Deploy to [Vercel](https://vercel.com) using `frontend/` directory with `npm run build` (`dist/`).
- **Backend**: Deploy to [Render](https://render.com) or [Railway](https://railway.app) using `backend/server.js`.
- **ML Service**: Deploy to [Render Web Service](https://render.com) using `ml_service/run.py`.
- **Database**: Connect to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) by setting `MONGODB_URI` in environment variables.

