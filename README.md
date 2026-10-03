# Meeting Room Booking System

A production-ready full-stack Meeting Room Booking System designed for reliable room reservations, zero-overlap scheduling, and instantaneous slot discovery.

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion, Lucide Icons
- **Backend**: Python FastAPI, SQLAlchemy 2.0, Pydantic v2, Uvicorn, Alembic
- **Database**: PostgreSQL (Neon Serverless / Render PostgreSQL / Supabase)
- **Deployment**: Vercel (Frontend CDN) + Render (Backend Web Service)

---

## Key Features

1. **Daily Room & Schedule Visualization**:
   - Filter by date with a single click.
   - Filter by specific meeting room or view all rooms simultaneously.
   - Pre-seeded with 5 distinct conference rooms and executive pods.

2. **Zero-Overlap Booking Conflict Engine**:
   - Working hours strictly enforced: **09:00 – 18:00**.
   - Interval overlap detection formula: `max(start_1, start_2) < min(end_1, end_2)`.
   - **Back-to-back bookings allowed**: e.g., 10:00–11:00 followed immediately by 11:00–12:00.
   - Informative HTTP 409 conflict responses identifying the exact colliding reservation.

3. **Earliest Next Available Slot Discovery**:
   - Algorithmic earliest gap finder for any requested duration (e.g., 15m, 30m, 45m, 60m).
   - Evaluates:
     - Morning gap from 09:00 to the first meeting.
     - Consecutive inter-booking gaps throughout the day.
     - Evening gap from the final meeting to 18:00.
   - Handles exact-match durations, contiguous bookings, and fully-booked conditions cleanly.

4. **Real-Time Notification System**:
   - Framer Motion animated toast alerts for creation, cancellation, conflicts, and errors.
   - Preserves actual server error details without generic "Something went wrong" placeholders.

5. **Cloud Deployment Ready**:
   - Auto-migrates and auto-seeds database on startup.
   - Dynamic `$PORT` handling on Render.
   - Production CORS configured with Vercel regex (`https://*.vercel.app`) and custom domain support.

---

## Pre-Seeded Meeting Rooms

The database automatically initializes with 5 conference rooms if empty:

| Room Name | Capacity | Floor / Location | Amenities |
| :--- | :---: | :--- | :--- |
| **Boardroom Alpha** | 16 | Floor 4, Executive Wing | Dual 4K Displays, Video Bar, Glass Whiteboard, Conference Phone |
| **Creative Lab** | 8 | Floor 2, Innovation Wing | Interactive Projector, Magnetic Whiteboard, Modular Desks |
| **Focus Pod Aurora** | 4 | Floor 1, Quiet Zone | 34" Ultrawide Monitor, Acoustic Dampening, Ergonomic Chairs |
| **Nexus Conference Hall**| 24 | Floor 3, Central Hub | Dual 85" Screens, Ceiling Microphone Array, Wireless Casting |
| **Strategy Suite** | 10 | Floor 4, West Wing | Interactive Touch Display, Speakerphone, Standing Table |

---

## Environment Variables

### 1. Backend Environment Variables (`backend/.env`)

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | `postgresql://user:pass@localhost:5432/meeting_rooms` | PostgreSQL connection string |
| `ENVIRONMENT` | Yes | `development` (or `production`) | Application environment |
| `PORT` | Yes | `8000` | Port for the Uvicorn server (Render sets `$PORT`) |
| `FRONTEND_URL` | Production | `https://<your-app>.vercel.app` | Deployed Vercel frontend URL |
| `CORS_ORIGINS` | No | `http://localhost:3000,https://*.vercel.app` | Comma-separated allowed CORS origins |

### 2. Frontend Environment Variables (`frontend/.env.local`)

| Variable | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8000` (local) / `https://<app>.onrender.com` (prod) | Base URL for FastAPI REST endpoints |

---

## Quickstart (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+ & pnpm (or npm)
- Local PostgreSQL instance or free Neon cloud database

### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your local or cloud DATABASE_URL

# Start backend server (auto-creates tables and seeds rooms)
uvicorn app.main:app --reload --port 8000
```
Backend will be active at:
- Root API: `http://localhost:8000/`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env.local

# Run Next.js development server
pnpm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running Automated Tests

### Backend Test Suite
```bash
cd backend
.venv\Scripts\pytest -v
```
Runs 64 automated tests covering:
- Room endpoints and validation
- Booking conflict matrix (partial overlaps, containment, exact matches, boundaries)
- Back-to-back booking permission (e.g. 10:00–11:00 and 11:00–12:00)
- Working hours restrictions (09:00–18:00)
- Next available slot continuous duration algorithm
- E2E 22-step integration workflow

### Frontend Production Build & Linting
```bash
cd frontend
pnpm run lint
pnpm run build
```

---

## Deployment

The application is deployed on Render.

### Note about the free Render instance

The backend uses Render's free web-service tier for this assignment.

Render automatically spins down free web services after 15 minutes without inbound traffic. When the service receives a new request after being idle, it may take approximately a minute to start again.

If the demo URL appears unavailable or slow on the first request, please wait for the service to wake up and refresh the page.

This behavior is a limitation of the hosting tier and is not an application error.

Detailed step-by-step instructions are available in [DEPLOYMENT.md](file:///c:/Users/lenovo/Desktop/assignments/aashita/DEPLOYMENT.md).

### Summary:
1. **Database**: Create a PostgreSQL database on [Neon](https://neon.tech) or [Render](https://render.com). Copy the connection string.
2. **Backend on Render**:
   - Create a Web Service pointing to `backend` directory.
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Set `DATABASE_URL`, `ENVIRONMENT=production`, and `FRONTEND_URL`.
3. **Frontend on Vercel**:
   - Import repository and set Root Directory to `frontend`.
   - Set `NEXT_PUBLIC_API_URL` to your deployed Render URL.
   - Deploy.

---

## License
MIT
