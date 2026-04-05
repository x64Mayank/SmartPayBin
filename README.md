# 🗑 SmartPayBin

SmartPayBin is an IoT-based smart waste management system built using the **MERN stack + Python**.
It enables users to deposit waste into physical smart bins, earn reward points verified by real hardware sensors, and track their environmental contributions — all orchestrated through a secure, session-based architecture.

---

## 📌 Project Overview

SmartPayBin allows users to:

- **Authenticate** and manage their accounts via a mobile-optimized web app
- **Scan a bin** (or enter its ID) to start a secure deposit session
- **Deposit waste** into a real (or simulated) smart bin with weight and type classification
- **Earn reward points** automatically calculated and credited by the server
- **Track activity** including total waste deposited, reward balance, and bin fill levels

---

## 🏗 System Architecture

```
User App (React)          Bin Kiosk (React)          Pi Simulator (Node.js / Python)
     │                         │                              │
     │ Start Session           │ Poll for Sessions            │
     ├────────────────► Backend API (Express) ◄──────────────┤
     │                         │                              │
     │                    MongoDB Atlas                       │
     │                         │                              │
     │ Poll Session Status     │ Ack + Complete Session       │
     ◄─────────────────────────┤──────────────────────────────┘
```

### Security Model
- **Users** can only declare *intent* ("I want to deposit at Bin X")
- **Bins** provide *ground truth* (verified weight and waste type from hardware sensors)
- The server only awards points when a trusted, API-key-authenticated bin reports data

---

## 📂 Project Structure

```
SmartPayBin/
│
├── backend/                    # Express.js REST API
│   ├── src/
│   │   ├── controllers/        # Business logic (user, deposit, bin)
│   │   ├── models/             # Mongoose schemas
│   │   ├── routes/             # API route definitions
│   │   ├── middlewares/        # JWT auth, bin API key auth
│   │   ├── utils/              # ApiError, ApiResponse, AsyncHandler
│   │   ├── server.js           # Express app configuration
│   │   └── index.js            # Entry point + DB connection
│   ├── .env                    # Environment variables
│   └── package.json
│
├── user-frontend/              # Mobile-optimized React app (User facing)
│   ├── src/
│   │   ├── pages/              # Login, Register, Dashboard, Deposit, ActiveSession
│   │   ├── features/           # Redux slices (authSlice)
│   │   ├── services/           # Axios API layer
│   │   ├── layouts/            # MobileLayout wrapper
│   │   ├── store/              # Redux store configuration
│   │   └── App.jsx             # Routes + auth hydration
│   ├── .env                    # VITE_BACKEND_URL
│   └── package.json
│
├── bin-frontend/               # Kiosk touchscreen UI (Bin facing)
│   ├── src/
│   │   ├── components/         # BinKiosk state machine
│   │   ├── services/           # Axios with API key auth headers
│   │   └── App.jsx
│   ├── .env                    # VITE_BACKEND_URL, VITE_BIN_ID, VITE_BIN_API_KEY
│   └── package.json
│
├── pi-simulator/               # Legacy Python simulator
│   ├── mock_pi.py
│   └── requirements.txt
│
├── steps.md                    # End-to-end testing guide
└── README.md
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js, MongoDB, Mongoose, JWT, bcrypt |
| User Frontend | React 19, Vite 8, Tailwind CSS v4, DaisyUI v5, Redux Toolkit, Axios |
| Bin Frontend | React 19, Vite 8, Tailwind CSS v4, DaisyUI v5, Axios |
| Hardware Sim | Node.js (`bin-simulator.js`) / Python (`mock_pi.py`) |

---

## 🚀 How to Set Up the Project

### Prerequisites

- **Node.js** v18+ and **npm**
- **MongoDB Atlas** account (or local MongoDB)
- **Git**

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/SmartPayBin.git
cd SmartPayBin
```

---

### 2️⃣ Set Up the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net
PORT=8000
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=7d
ADMIN_SECRET=your_admin_secret
COOKIE_DOMAIN=.yourdomain.com
TRUST_PROXY=true
```

Backend notes:

- `CORS_ORIGIN` is an explicit allowlist. Add only the frontend origins you trust.
- `TRUST_PROXY=true` is only needed when the backend sits behind a reverse proxy or load balancer.
- `COOKIE_DOMAIN` is optional and only needed if you want cookies shared across subdomains.

Production cookie notes:

- `httpOnly` cookies are used for `accessToken` and `refreshToken`, so JavaScript cannot read them directly.
- In production, the backend sets `Secure` and `SameSite=None` so cookies can be sent over HTTPS across separate origins.
- If the app is deployed behind a reverse proxy or load balancer, set `TRUST_PROXY=true` on the platform and enable Express trust proxy in your deployment setup.
- If your frontend and backend share the same site, you can keep `SameSite=Lax`, but the current code defaults to `None` in production for compatibility with cross-origin hosting.

Start the backend:

```bash
npm run dev
```

The server will start on `http://localhost:8000`.

---

### 3️⃣ Set Up the User Frontend

```bash
cd user-frontend
npm install
```

Create a `.env` file inside `user-frontend/`:

```env
# Optional in local dev when using the Vite proxy. Set a fixed backend URL only if you are bypassing the proxy or building for a separate production API.
VITE_BACKEND_URL=
```

The user frontend uses Vite dev proxy routes for `/users` and `/api`, so the browser can stay on the frontend origin during local development.

Start the dev server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

### 4️⃣ Set Up the Bin Frontend

```bash
cd bin-frontend
npm install
```

Before creating the `.env`, you need to **register a bin** first (see Step 5). Then create a `.env` file inside `bin-frontend/`:

```env
# Optional in local dev when using the Vite proxy. Set a fixed backend URL only if you are bypassing the proxy or building for a separate production API.
VITE_BACKEND_URL=
VITE_BIN_ID=<bin_id_from_registration>
VITE_BIN_API_KEY=<api_key_from_registration>
```

The bin frontend uses a Vite dev proxy route for `/api`, so the browser can stay on the frontend origin during local development.

Start the dev server:

```bash
npm run dev
```

The kiosk UI will be available at `http://localhost:5174`.

---

### 5️⃣ Register a Physical Bin

With the backend running, create a bin entity in the database:

```bash
curl -X POST http://localhost:8000/api/bin/register \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your_admin_secret" \
  -d '{"name":"Main Lobby Bin","location":"Campus Center","capacity":100}'
```

The response will contain:
- `bin._id` — Use this as `VITE_BIN_ID`
- `apiKey` — Use this as `VITE_BIN_API_KEY`

Paste these values into `bin-frontend/.env` and restart the bin frontend.

---

## 🧪 End-to-End Testing

With all three services running simultaneously:

| Service | URL | Purpose |
|---------|-----|---------|
| Backend | `http://localhost:8000` | REST API |
| User App | `http://localhost:5173` | Mobile user interface |
| Bin Kiosk | `http://localhost:5174` | Hardware touchscreen UI |

### Testing Flow

1. **Register & Login** on the User App (`localhost:5173`)
2. Click **"Start Deposit"** on the Dashboard
3. Paste the **Bin ID** and click "Simulate Scan"
4. Watch the **Bin Kiosk** (`localhost:5174`) automatically detect the session and unlock
5. On the Kiosk, select a **waste type** and **weight**, then click "End Deposit"
6. Watch the **User App** automatically show the reward summary with points earned

For detailed step-by-step instructions, see [`steps.md`](./steps.md).

---

## 📊 Current Project Status

| Module | Status |
|--------|--------|
| Express Server | ✅ Working |
| MongoDB Connection | ✅ Working |
| User Authentication (JWT) | ✅ Working |
| Session-Based Deposit Flow | ✅ Working |
| Bin Registration & API Keys | ✅ Working |
| User Frontend (React) | ✅ Working |
| Bin Kiosk Frontend (React) | ✅ Working |
| Reward Calculation | ✅ Implemented |
| Fill Percentage Tracking | ✅ Implemented |
| Hardware Simulator | ✅ Working (Node.js + Python) |
| Real Raspberry Pi | ⏳ Not Integrated |
| Cloud Deployment | ⏳ Not Started |

---

## 🔮 Future Improvements

- Real Raspberry Pi hardware integration with weight sensors
- QR code scanning via phone camera (requires HTTPS)
- Admin dashboard for bin management and analytics
- Real-time updates via WebSockets / Socket.io
- MQTT support for scalable IoT communication
- Cloud deployment (AWS / DigitalOcean / Vercel)
- Push notifications for deposit confirmations

---

## 👨‍💻 Author

SmartPayBin – IoT + MERN Startup Prototype
Built as part of a B.Tech project and startup initiative.

---