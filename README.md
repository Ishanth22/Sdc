<p align="center">
  <h1 align="center">🚀 VenturePulse</h1>
  <p align="center">
    <strong>National Startup Progress Monitoring System</strong>
  </p>
  <p align="center">
    AI-powered startup analytics platform with intelligent scoring, predictive forecasting, risk assessment, and real-time dashboards.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Vite-7.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
</p>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Role-Based Access](#role-based-access)
- [AI-Powered Features](#ai-powered-features)
- [Screenshots](#screenshots)
- [License](#license)

---

## Overview

**VenturePulse** (NSPMS — National Startup Progress Monitoring System) is a full-stack web application designed to track, analyze, and visualize the progress of startups across multiple dimensions — financial, operational, innovation, and societal impact. It provides AI-driven insights, predictive analytics, and an intelligent scoring engine to help founders, investors, and administrators make data-driven decisions.

---

## Features

### 🏢 For Founders
- **Dashboard** — Real-time overview of key metrics with interactive charts (Recharts)
- **Metrics Submission** — Submit monthly data across financial, operational, innovation, and impact categories
- **Vitality Score** — Composite health score (0–100) computed from 9 weighted components
- **Milestone Tracking** — Create, track, and manage startup milestones with progress indicators
- **AI Advisor** — Conversational AI assistant powered by Google Gemini via OpenRouter for strategic guidance
- **Forecasting** — Predictive revenue, user growth, and runway projections with cached results
- **What-If Simulation** — Interactive scenario modeling to test business decisions before execution
- **Custom KPIs** — Define and monitor custom key performance indicators tailored to your business
- **Reports** — Generate and export comprehensive performance reports
- **AI Risk Dashboard** — AI-driven risk assessment with severity levels and actionable recommendations
- **Alert System** — Configurable alerts for critical metrics (runway, burn rate, churn spikes) via email (Gmail) and SMS (Twilio)
- **Subscription Plans** — Tiered access to premium features

### 📊 For Investors
- **Investor Dashboard** — Portfolio-level view across multiple startups
- **Benchmark Comparison** — Compare startup performance against sector and stage averages
- **Audit Logs** — Full audit trail of all data submissions and changes

### 🛡️ For Admins
- **Admin Dashboard** — Platform-wide oversight of all registered startups
- **Startup Detail View** — Deep-dive into any startup's metrics and scores
- **User Management** — Manage user accounts and roles

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite 7, TailwindCSS 4, Recharts |
| **Backend** | Node.js, Express 4, TypeScript |
| **Database** | MongoDB Atlas with Mongoose ODM |
| **AI/ML** | Google Gemini (via OpenRouter API) |
| **Authentication** | JWT (JSON Web Tokens) with bcrypt password hashing |
| **Notifications** | Nodemailer (Gmail SMTP) + Twilio (SMS) |
| **State Management** | React Context API |
| **Routing** | React Router DOM v7 |
| **HTTP Client** | Axios |
| **Markdown** | react-markdown for AI advisor responses |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND (Vite + React)            │
│  ┌─────────┐  ┌──────────┐  ┌───────────────────┐   │
│  │  Pages   │  │Components│  │  Context (Auth)   │   │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘   │
│       └──────────────┴────────────────┘               │
│                     Axios API Client                  │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP (REST)
┌──────────────────────▼───────────────────────────────┐
│                  BACKEND (Express + TS)               │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ Routes  │──│Middleware │  │    Services       │    │
│  │ (17 API)│  │  (Auth)   │  │ • AI Advisor      │    │
│  └────┬────┘  └──────────┘  │ • Risk Engine      │    │
│       │                      │ • Alert Notifier   │    │
│       │                      │ • Vitality Score   │    │
│       │                      │ • Forecasting      │    │
│       │                      │ • Benchmarking     │    │
│       │                      └──────────────────┘    │
└───────┴──────────────────────────────────────────────┘
                       │ Mongoose
┌──────────────────────▼───────────────────────────────┐
│              MongoDB Atlas (12 Collections)           │
│  User │ StartupProfile │ Metrics │ VitalityScore     │
│  Alert │ Milestone │ Benchmark │ Organization        │
│  CustomKPI │ ForecastCache │ Subscription │ AuditLog │
└──────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MongoDB Atlas** account (or local MongoDB instance)
- **OpenRouter API key** (for AI features)
- **Gmail App Password** (optional — for email alerts)
- **Twilio Account** (optional — for SMS alerts)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ishanth22/Sdc.git
   cd Sdc
   ```

2. **Set up environment variables**
   ```bash
   # Root level
   cp .env.example .env

   # Backend level
   cp backend/.env.example backend/.env
   ```
   Fill in your MongoDB URI, JWT secret, and API keys (see [Environment Variables](#environment-variables)).

3. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. **Seed the database** (optional — populates demo data)
   ```bash
   cd backend
   npm run seed
   ```

5. **Start the development servers**

   **Backend** (runs on `http://localhost:5000`):
   ```bash
   cd backend
   npm run dev
   ```

   **Frontend** (runs on `http://localhost:5173`):
   ```bash
   cd frontend
   npm run dev
   ```

6. **Open the app** — Navigate to `http://localhost:5173`

---

## Environment Variables

### Root `.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Backend server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/nspms` |
| `JWT_SECRET` | Secret key for JWT signing | `your_super_secret_jwt_key` |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI features | `sk-or-v1-...` |

### Backend `.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/sdc` |
| `JWT_SECRET` | Secret key for JWT token signing | `your_super_secret_jwt_key` |
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-v1-...` |
| `GMAIL_USER` | Gmail address for email alerts | `your.email@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16-char) | `xxxx xxxx xxxx xxxx` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `ACxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_twilio_auth_token` |
| `TWILIO_PHONE_NUMBER` | Twilio phone number for SMS | `+1XXXXXXXXXX` |

---

## API Reference

All API routes are prefixed with `/api`.

| Endpoint | Method(s) | Description | Auth |
|----------|-----------|-------------|------|
| `/api/auth` | POST | Register, login, password reset, token refresh | Public / JWT |
| `/api/startup` | GET, POST, PUT | Startup profile CRUD | JWT |
| `/api/metrics` | GET, POST | Submit & retrieve monthly metrics | JWT |
| `/api/score` | GET | Get vitality score for a startup | JWT |
| `/api/benchmark` | GET | Sector/stage benchmark comparisons | JWT |
| `/api/milestones` | GET, POST, PUT, DELETE | Milestone management | JWT |
| `/api/alerts` | GET, POST, PUT | Alert configuration & history | JWT |
| `/api/advisor` | POST | AI-powered strategic advice | JWT |
| `/api/forecast` | GET | Predictive forecasting (cached) | JWT |
| `/api/simulation` | POST | What-if scenario modeling | JWT |
| `/api/custom-kpi` | GET, POST, PUT, DELETE | Custom KPI management | JWT |
| `/api/subscription` | GET, POST | Subscription plan management | JWT |
| `/api/reports` | GET, POST | Report generation & export | JWT |
| `/api/ai-risk` | GET | AI risk assessment | JWT |
| `/api/investor` | GET | Investor portfolio dashboard | JWT (investor) |
| `/api/admin` | GET | Admin platform overview | JWT (admin) |
| `/api/audit` | GET | Audit log retrieval | JWT |
| `/api/health` | GET | Server health check | Public |

---

## Database Schema

The application uses **12 MongoDB collections**:

| Model | Description | Key Fields |
|-------|-------------|------------|
| **User** | User accounts with role-based access | `email`, `role` (founder/investor/admin), `organizationId` |
| **StartupProfile** | Registered startup details | `companyName`, `sector`, `stage`, `city`, `teamSize` |
| **Metrics** | Monthly performance data | `financial`, `operational`, `innovation`, `impact` |
| **VitalityScore** | Computed health scores per period | `score` (0–100), 9 component scores, `riskFlags` |
| **Alert** | Triggered alerts for metric anomalies | `type`, `severity` (info/warning/critical), `message` |
| **Milestone** | Project milestones and goals | Title, status, deadlines, progress tracking |
| **Benchmark** | Sector/stage aggregated benchmarks | Sector averages for comparison |
| **Organization** | Multi-user organizations | `members[]`, `invites[]`, role-based permissions |
| **CustomKPI** | User-defined KPIs | Custom metric definitions and values |
| **ForecastCache** | Cached AI predictions | Forecast results with TTL |
| **Subscription** | User subscription plans | Plan tier, features, billing |
| **AuditLog** | Activity audit trail | Action, user, timestamp, changes |

---

## Project Structure

```
Sdc/
├── .env.example              # Root environment template
├── .gitignore
├── package.json              # Root dependencies (marked, pdfkit)
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── scripts/              # Utility scripts
│   │   ├── diagAlert.ts      #   Alert system diagnostics
│   │   ├── setAlertContact.ts#   Set alert contact info
│   │   └── testAlert.ts      #   Test alert delivery
│   └── src/
│       ├── index.ts           # Express app entry point
│       ├── seed.ts            # Database seeder
│       ├── seedAllPersonas.ts # Multi-persona demo data
│       ├── seedDemoData.ts    # Demo dataset generator
│       ├── seedFounder1Demo.ts# Founder 1 demo profile
│       ├── seedFounder2.ts    # Founder 2 demo profile
│       ├── clearCache.ts      # Cache cleanup utility
│       ├── middleware/
│       │   └── auth.ts        # JWT authentication middleware
│       ├── models/            # Mongoose schemas (12 models)
│       │   ├── User.ts
│       │   ├── StartupProfile.ts
│       │   ├── Metrics.ts
│       │   ├── VitalityScore.ts
│       │   ├── Alert.ts
│       │   ├── Milestone.ts
│       │   ├── Benchmark.ts
│       │   ├── Organization.ts
│       │   ├── CustomKPI.ts
│       │   ├── ForecastCache.ts
│       │   ├── Subscription.ts
│       │   └── AuditLog.ts
│       ├── routes/            # Express route handlers (17 routes)
│       │   ├── auth.ts
│       │   ├── startup.ts
│       │   ├── metrics.ts
│       │   ├── score.ts
│       │   ├── benchmark.ts
│       │   ├── admin.ts
│       │   ├── milestones.ts
│       │   ├── alerts.ts
│       │   ├── investor.ts
│       │   ├── advisor.ts
│       │   ├── forecast.ts
│       │   ├── simulation.ts
│       │   ├── customKpi.ts
│       │   ├── subscription.ts
│       │   ├── audit.ts
│       │   ├── reports.ts
│       │   └── aiRisk.ts
│       └── services/          # Business logic & AI services
│           ├── aiAdvisor.ts         # Google Gemini AI advisor
│           ├── aiRiskEngine.ts      # AI-powered risk assessment
│           ├── alertNotifier.ts     # Email (Gmail) & SMS (Twilio)
│           ├── benchmarkAggregator.ts# Sector benchmark computation
│           ├── forecasting.ts       # Predictive analytics engine
│           └── vitalityScore.ts     # Vitality score calculator
│
└── frontend/
    ├── package.json
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── eslint.config.js
    └── src/
        ├── main.tsx              # React entry point
        ├── App.tsx               # Route definitions
        ├── index.css             # Global styles
        ├── api/
        │   └── client.ts         # Axios HTTP client
        ├── context/
        │   └── AuthContext.tsx    # Authentication state
        ├── components/
        │   ├── Navbar.tsx         # Navigation bar
        │   ├── ProtectedRoute.tsx # Route guard (role-based)
        │   ├── ScoreGauge.tsx     # Vitality score gauge widget
        │   └── MetricsChangeSummary.tsx # Metrics diff display
        └── pages/                # 17 page components
            ├── Login.tsx
            ├── Dashboard.tsx
            ├── MetricsForm.tsx
            ├── History.tsx
            ├── Profile.tsx
            ├── Milestones.tsx
            ├── AIAdvisor.tsx
            ├── Forecasting.tsx
            ├── Simulation.tsx
            ├── CustomKPIs.tsx
            ├── Reports.tsx
            ├── Plans.tsx
            ├── AlertSettings.tsx
            ├── AIRiskDashboard.tsx
            ├── InvestorDashboard.tsx
            ├── AdminDashboard.tsx
            └── AdminStartupDetail.tsx
```

---

## Role-Based Access

The platform supports three user roles with distinct permissions:

| Role | Dashboard | Capabilities |
|------|-----------|-------------|
| **Founder** | `/dashboard` | Full access to metrics, milestones, AI tools, forecasting, simulation, reports, alerts, and custom KPIs |
| **Investor** | `/investor` | Read-only portfolio view with benchmark comparisons and audit logs |
| **Admin** | `/admin` | Platform-wide oversight, startup detail drill-down, user management |

Authentication is handled via JWT tokens with middleware-based route protection. The frontend uses `<ProtectedRoute>` components with `requiredRole` props to enforce client-side access control.

---

## AI-Powered Features

### 🤖 AI Advisor
- Conversational interface powered by **Google Gemini** (via OpenRouter)
- Context-aware: ingests startup profile, latest metrics, and vitality scores
- Provides strategic recommendations, fundraising advice, and growth strategies

### 📈 Predictive Forecasting
- Revenue projections, user growth trends, and runway estimations
- Results are cached in `ForecastCache` to minimize API calls
- Historical trend analysis with confidence intervals

### ⚠️ AI Risk Engine
- Automated risk detection across financial, operational, and growth dimensions
- Severity classification: `info`, `warning`, `critical`
- Actionable risk mitigation recommendations

### 🔮 What-If Simulation
- Interactive scenario modeling for business decisions
- Adjust parameters (funding, burn rate, growth rate) and see projected outcomes
- Compare multiple scenarios side-by-side

---

## Scripts

| Command | Location | Description |
|---------|----------|-------------|
| `npm run dev` | `backend/` | Start backend dev server with hot-reload |
| `npm run build` | `backend/` | Compile TypeScript to JavaScript |
| `npm run start` | `backend/` | Run compiled production build |
| `npm run seed` | `backend/` | Seed database with demo data |
| `npm run dev` | `frontend/` | Start Vite dev server with HMR |
| `npm run build` | `frontend/` | Build production bundle |
| `npm run lint` | `frontend/` | Run ESLint |
| `npm run preview` | `frontend/` | Preview production build |

---

## License

This project is developed as part of an academic initiative. All rights reserved.

---

<p align="center">
  Built with ❤️ using React, Express, MongoDB, and AI
</p>
