# Production Deployment Guide

This guide provides end-to-end instructions for deploying the **Meeting Room Booking System** to production.

- **Frontend**: [Vercel](https://vercel.com) (Next.js App Router, Tailwind CSS, Framer Motion)
- **Backend**: [Render](https://render.com) (FastAPI, Python 3.12, Uvicorn)
- **Database**: Managed PostgreSQL on [Neon](https://neon.tech), [Render PostgreSQL](https://render.com), or [Supabase](https://supabase.com)

---

## Architecture Overview

```
┌─────────────────────────────────┐
│     Client Web Browser          │
│ (Desktop & Mobile Responsive)   │
└───────────────┬─────────────────┘
                │ HTTPS
                ▼
┌─────────────────────────────────┐         HTTPS / REST          ┌──────────────────────────────────┐
│        Vercel (Frontend)        │ ────────────────────────────> │         Render (Backend)         │
│  - Next.js 16 App Router        │                               │  - FastAPI production app        │
│  - Tailwind CSS + Framer Motion │                               │  - Uvicorn on 0.0.0.0:$PORT      │
│  - Lucide Icons                 │                               │  - Real-time conflict engine     │
│  - NEXT_PUBLIC_API_URL          │                               │  - /docs & /api/health           │
└─────────────────────────────────┘                               └─────────────────┬────────────────┘
                                                                                    │ SQL (SSL)
                                                                                    ▼
                                                                  ┌──────────────────────────────────┐
                                                                  │   Cloud PostgreSQL Database      │
                                                                  │   (Neon / Render / Supabase)     │
                                                                  │   - rooms (5 pre-seeded)         │
                                                                  │   - bookings (indexed)           │
                                                                  └──────────────────────────────────┘
```

---

## 1. Cloud Database Setup (Neon / Render / Supabase)

### Option A: Neon Serverless PostgreSQL (Recommended)
1. Sign in to [Neon Console](https://console.neon.tech).
2. Create a new project (e.g., `meeting-room-system`).
3. Under **Dashboard**, copy your PostgreSQL connection string:
   ```
   postgresql://<user>:<password>@<endpoint-id>.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

### Option B: Render Managed PostgreSQL
1. In your Render Dashboard, click **New +** -> **PostgreSQL**.
2. Give it a name (e.g., `meeting-room-db`).
3. Select the **Free** instance type.
4. Once provisioned, copy the **Internal Database URL** (if deploying backend on the same Render team) or **External Database URL**.

### Option C: Supabase PostgreSQL
1. Sign in to [Supabase](https://supabase.com) and create a project.
2. In **Project Settings** -> **Database**, copy the **URI** connection string.
3. Replace `[YOUR-PASSWORD]` with your database password.

---

## 2. Backend Deployment on Render

### Step 1: Create a New Web Service
1. In your [Render Dashboard](https://dashboard.render.com), click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the service settings:

| Setting | Value | Notes |
| :--- | :--- | :--- |
| **Name** | `meeting-room-booking-api` | Your custom service name |
| **Region** | Choose closest to users (e.g., Oregon or Frankfurt) | Match DB region for low latency |
| **Branch** | `master` (or `main`) | Deployment branch |
| **Root Directory** | `backend` | **Important**: points to backend folder |
| **Runtime** | `Python 3` | Python runtime |
| **Build Command** | `pip install -r requirements.txt` | Installs dependencies |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Production Uvicorn binding |
| **Instance Type** | Free | Or Starter |

> **Alternative Start Command**: You can also use `python run.py`, which automatically resolves `$PORT` and binds to `0.0.0.0`.

### Step 2: Configure Environment Variables on Render
Under the **Environment Variables** tab, add the following:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://user:pass@ep-xyz.aws.neon.tech/neondb?sslmode=require` | Cloud DB connection string |
| `ENVIRONMENT` | `production` | Production environment flag |
| `FRONTEND_URL` | `https://aashita-assignment.vercel.app` | Vercel domain to allow in CORS |
| `CORS_ORIGINS` | `http://localhost:3000,https://aashita-assignment.vercel.app,https://*.vercel.app` | Comma-separated allowed origins |
| `PYTHON_VERSION` | `3.12.0` | Recommended Python version |

### Step 3: Automated Database Migration & Seeding
The backend handles database initialization automatically on startup:
- During FastAPI startup (`lifespan`), the application executes `Base.metadata.create_all(bind=engine)`.
- The application then checks if the `rooms` table is empty and seeds the 5 default meeting rooms (`seed_rooms(db)`).
- **Manual Alembic Command (Optional)**: If you prefer applying migrations manually via Render Shell:
  ```bash
  alembic upgrade head
  python -m app.seed
  ```

### Step 4: Verify Backend Health
Once deployed, verify the Render service URL (`https://aashita-assignment.onrender.com`):
- Root metadata: `GET https://aashita-assignment.onrender.com/`
- Health check: `GET https://aashita-assignment.onrender.com/api/health`
- Interactive API Docs: `GET https://aashita-assignment.onrender.com/docs`
- Seeded Rooms: `GET https://aashita-assignment.onrender.com/api/rooms`

---

## 3. Frontend Deployment on Vercel

### Step 1: Import Project to Vercel
1. Sign in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your Git repository.

### Step 2: Configure Project Settings
In the configuration screen:

1. **Root Directory**: Click **Edit** and select `frontend`.
2. **Framework Preset**: Verify `Next.js` is detected.
3. **Build & Output Settings**: Leave defaults:
   - Build Command: `next build` (or `pnpm run build`)
   - Output Directory: `.next`
   - Install Command: `pnpm install` (or `npm install`)

### Step 3: Add Environment Variables on Vercel
Under the **Environment Variables** section, add:

| Key | Value | Environment |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://aashita-assignment.onrender.com` | Production, Preview, Development |

> **Note**: Do NOT include a trailing slash. If added inadvertently, the frontend client automatically sanitizes it.

### Step 4: Deploy
Click **Deploy**. Vercel will install dependencies, compile Tailwind CSS styles, build the Next.js App Router routes, and deploy the application to a high-availability CDN.

---

## 4. Post-Deployment Verification Checklist

- [ ] Open the Vercel URL in a desktop and mobile browser.
- [ ] Confirm all 5 seeded rooms appear in the Room Filter and Room Cards.
- [ ] Create a booking for today and verify the real-time success toast.
- [ ] Attempt creating a conflicting booking and verify the HTTP 409 conflict card toast identifies the colliding reservation.
- [ ] Create a back-to-back booking (e.g. 10:00–11:00 and 11:00–12:00) and verify it succeeds.
- [ ] Query the **Next Available Slot** finder for 45 minutes and verify the earliest continuous opening is returned.
- [ ] Cancel a booking and confirm real-time UI refresh and cancellation toast.
- [ ] Verify `/docs` Swagger UI loads on the Render backend URL.
