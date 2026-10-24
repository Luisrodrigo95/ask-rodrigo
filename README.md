# Ask-Rodrigo 🚀

> **Interactive Technical AI Assistant & Antigravity CLI Web Bridge for Luis Rodrigo García Hernández**  
> Live at [https://therodrigo.com/ask-rodrigo/](https://therodrigo.com/ask-rodrigo/)

Ask-Rodrigo is a production-grade fullstack web application that serves as both a public technical portfolio assistant for recruiters and visitors, and an authenticated remote operations bridge to **Antigravity CLI** (`agy`) on a Debian 13 VPS.

---

## 🌟 Key Features

### 1. Dual-Role Security Model
- **Public Guest Mode (Read-Only)**:
  - Instant 1-click access for visitors and hiring managers.
  - Powered by a verified, grounded knowledge engine detailing Rodrigo's professional career:
    - Current role at **ZAP-Hosting** (Dedicated blades, SteamCMD, Proxmox VE, PletX DDoS packet analysis with Wireshark).
    - 5+ years at **Continental Automotive** (FOSSology, Black Duck Hub, SPDX, Autosys, Scrum Master).
    - Education at **ITESM** (B.S. in Digital Systems & Robotics Engineering).
    - Production platforms (**PresWin**, **therodrigo.com**, **TotiMigraciones**, **Appointment Checker**).
  - Strictly sandboxed: No terminal execution, no file access, and no server metrics.
- **Admin Mode (Rodrigo Only)**:
  - Authenticated via **Google OAuth** (strictly gated to `lg2012garcia@gmail.com`) or custom PIN.
  - Unrestricted direct execution bridge to **Antigravity CLI** (`/usr/bin/agy`) with live token streaming (SSE).
  - Enables full server management, code editing, package builds, and multi-turn coding sessions.

### 2. Live Telemetry & Server Metrics
- Real-time VPS health dashboard:
  - CPU utilization & core counts.
  - Memory (RAM) distribution & swap usage.
  - SSD storage consumption.
  - PM2 application cluster status.
  - Systemd critical daemons health check.

### 3. Integrated Calendar & Milestones
- Scheduling dashboard for consular appointments, server maintenance windows, and project milestones.

### 4. Internationalization & Custom Preferences
- **Default English (`en`)** with instant toggle to **Spanish (`es`)**.
- Built-in Web Speech API audio synthesis with configurable playback speed (`0.9x`, `1.0x`, `1.2x`).
- Custom Google Cloud OAuth Client ID configuration dialog.

---

## 🛠️ Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────┐
│                   Ask-Rodrigo Client                   │
│        React 19 • Tailwind CSS • Lucide • Vite        │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / HTTP/2 (Nginx)
┌──────────────────────────▼─────────────────────────────┐
│                   Ask-Rodrigo Server                   │
│          Node.js 22 LTS • Express 5 • JWT • SSE        │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
       (Guest Mode: Safe)         (Admin Mode: Gated)
               │                          │
┌──────────────▼─────────────┐   ┌────────▼──────────────┐
│  Grounded Knowledge Base   │   │ Antigravity CLI (AGy) │
│   JSON & Fallback Model    │   │  Native VPS Subprocess│
└────────────────────────────┘   └───────────────────────┘
```

- **Frontend**: React 19, Tailwind CSS, Lucide React icons, Marked markdown parser, Vite.
- **Backend**: Node.js 22 LTS, Express 5, `google-auth-library`, `jsonwebtoken`, Server-Sent Events (SSE).
- **Process Manager**: PM2 Cluster mode.
- **Reverse Proxy**: Nginx (Let's Encrypt SSL, HTTP/2, subpath `/ask-rodrigo/`).

---

## 🚀 Getting Started

### Prerequisites
- Node.js v20+ or v22 LTS
- npm or pnpm

### 1. Clone the repository
```bash
git clone https://github.com/Luisrodrigo95/ask-rodrigo.git
cd ask-rodrigo
```

### 2. Configure Environment Variables
Copy the example environment configuration:
```bash
cp server/.env.example server/.env
```
Fill in the parameters in `server/.env`:
```ini
PORT=3005
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Authentication & Security
JWT_SECRET=replace_with_a_secure_random_string
ADMIN_PIN=your_custom_admin_pin
ADMIN_EMAILS=your_email@gmail.com
PRIMARY_ADMIN_EMAIL=your_email@gmail.com
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com

# AI Model Configuration (Optional fallback for guest engine)
GEMINI_API_KEY=
OPENAI_API_KEY=
AI_MODEL=gemini-2.5-flash
```

### 3. Install Dependencies
```bash
# Install root, server, and client packages
npm install
npm --prefix server install
npm --prefix client install
```

### 4. Run Development Servers
In two separate terminals:
```bash
# Terminal 1: Backend API
npm --prefix server run dev

# Terminal 2: Frontend Client
npm --prefix client run dev
```

### 5. Production Build & Deployment
```bash
# Build frontend static assets into client/dist
npm --prefix client run build

# Start server via PM2
pm2 start ecosystem.config.cjs
```

---

## 🔒 Security Best Practices
- **No Secrets in Source**: All API keys, JWT secrets, and PINs are strictly loaded from environment variables (`.env`).
- **Strict OAuth Gating**: Google OAuth tokens are verified directly against Google endpoints (`tokeninfo` and `userinfo`); only authorized emails receive admin privileges.
- **Input Sanitization**: Guest prompt requests are strictly bound to read-only knowledge domains.

---

## 📄 License
MIT © [Luis Rodrigo García Hernández](https://therodrigo.com)
