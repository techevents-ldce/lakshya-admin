# 🎯 Lakshya — College Tech-Fest Management System

A production-ready **MERN stack** application for managing the **Lakshya** college tech-fest. Features a **unified portal** with role-based access for Admin and Coordinator — connected to a shared Node.js/Express REST API with MongoDB.

---

## 📁 Project Structure

```
├── server/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/          # DB connection, env
│   │   ├── controllers/     # HTTP handlers
│   │   ├── middleware/       # Auth, RBAC, validation, audit, error
│   │   ├── models/          # 10 Mongoose models
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic layer
│   │   ├── utils/           # JWT, bcrypt, logger, export helpers
│   │   ├── validations/     # Joi schemas
│   │   ├── scripts/         # Seed script
│   │   ├── app.js           # Express app
│   │   └── server.js        # Entry point
│   ├── .env.example
│   └── Dockerfile
│
├── client/                  # Unified React Portal (Vite + TailwindCSS)
│   ├── src/                 # Shared app entry, context, services
│   │   ├── components/      # PrivateRoute, RoleLayout, RoleRoute
│   │   ├── context/         # Shared AuthContext
│   │   ├── pages/           # Login, RoleDashboard
│   │   └── services/        # Shared Axios API client
│   ├── admin/src/           # Admin-specific pages & components
│   │   ├── components/      # Sidebar, Layout
│   │   └── pages/           # Dashboard, Events, Users, etc. (9 pages)
│   └── coordinator/src/     # Coordinator-specific pages & components
│       ├── components/      # Layout (navbar)
│       └── pages/           # Dashboard, Participants, QR Scanner
│
├── nginx/nginx.conf         # Reverse proxy config
├── docker-compose.yml       # Full-stack orchestration
├── render.yaml              # Render.com backend config
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js >= 18
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd server
cp .env.example .env        # Edit MONGO_URI, JWT_SECRET
npm install
npm run seed                 # Creates admin & coordinator accounts
npm run dev                  # Runs on http://localhost:5000
```

### 2. Frontend (Unified Portal)

```bash
cd client
npm install
npm run dev                  # Runs on http://localhost:5173
```

> **That's it! Just 2 terminals** — one for the backend, one for the frontend.
> The unified portal shows a **role selector** at login (Admin or Coordinator).

---

## 🔑 Default Credentials

| Role         | Email                     | Password       |
|--------------|---------------------------|----------------|
| **Admin**    | `admin@lakshya.com`       | `Admin@1234`   |
| **Coordinator** | `coordinator@lakshya.com` | `Coord@1234` |

> Run `npm run seed` in the `server/` directory to create these accounts.

---

## 🐳 Docker Deployment

```bash
# From project root
cp server/.env.example server/.env  # Configure env vars
docker-compose up --build

# Access:
#   API:       http://localhost:5000
#   Portal:    http://localhost:80 (via Nginx)
```

---

## ☁️ Cloud Deployment

### Backend → Render.com
1. Push to GitHub
2. Create a new **Web Service** on Render
3. Set root directory to `server/`
4. Set environment variables: `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ALLOWED_ORIGINS`

### Frontend → Vercel
1. Deploy `client/` as a single Vercel project
2. Set `VITE_API_URL` environment variable to your Render backend URL (e.g., `https://lakshya-api.onrender.com/api`)

---

## 🔐 Environment Variables

| Variable              | Description                    | Default                |
|-----------------------|--------------------------------|------------------------|
| `PORT`                | Server port                    | 5000                   |
| `MONGO_URI`           | MongoDB connection string      | mongodb://localhost:27017/lakshya |
| `JWT_SECRET`          | Access token secret            | (required)             |
| `JWT_REFRESH_SECRET`  | Refresh token secret           | (required)             |
| `JWT_ACCESS_EXPIRES`  | Access token expiry            | 15m                    |
| `JWT_REFRESH_EXPIRES` | Refresh token expiry           | 7d                     |
| `ALLOWED_ORIGINS`     | CORS origins (comma-separated) | http://localhost:5173   |
| `RATE_LIMIT_WINDOW_MS`| Rate limit window              | 900000 (15 min)        |
| `RATE_LIMIT_MAX`      | Max requests per window        | 20                     |
| `RESEND_API_KEY`      | Resend API key for bulk email ([get one here](https://resend.com/api-keys)) | (required for email) |
| `RESEND_FROM_EMAIL`   | Sender address (must be verified domain on Resend) | `Lakshya <onboarding@resend.dev>` |

---

## 📊 API Endpoints

### Auth
| Method | Endpoint             | Access      |
|--------|----------------------|-------------|
| POST   | `/api/auth/login`    | Public      |
| POST   | `/api/auth/register` | Public      |
| POST   | `/api/auth/refresh`  | Public      |
| GET    | `/api/auth/me`       | Authenticated |

### Events
| Method | Endpoint                                | Access |
|--------|-----------------------------------------|--------|
| GET    | `/api/events`                           | Public |
| GET    | `/api/events/:id`                       | Public |
| POST   | `/api/events`                           | Admin  |
| PUT    | `/api/events/:id`                       | Admin  |
| DELETE | `/api/events/:id`                       | Admin  |
| PATCH  | `/api/events/:id/toggle-registration`   | Admin  |

### Users & Coordinators
| Method | Endpoint                              | Access |
|--------|---------------------------------------|--------|
| GET    | `/api/users`                          | Admin  |
| POST   | `/api/users/coordinators`             | Admin  |
| PATCH  | `/api/users/:id/assign-events`        | Admin  |
| PATCH  | `/api/users/:id/reset-password`       | Admin  |
| PATCH  | `/api/users/:id/block`                | Admin  |
| PATCH  | `/api/users/:id/unblock`              | Admin  |

### Tickets
| Method | Endpoint                         | Access              |
|--------|----------------------------------|---------------------|
| GET    | `/api/tickets/verify/:ticketId`  | Admin, Coordinator  |
| GET    | `/api/tickets/event/:eventId`    | Admin, Coordinator  |
| GET    | `/api/tickets/my`                | Authenticated       |

### Other
| Endpoint               | Access             |
|------------------------|--------------------|
| `/api/registrations`   | Admin, Coordinator |
| `/api/payments`        | Admin              |
| `/api/analytics/dashboard` | Admin          |
| `/api/export/participants` | Admin, Coordinator |
| `/api/export/payments` | Admin              |
| `/api/audit-logs`      | Admin              |
| `/api/organizers`      | Public (GET), Admin (CUD) |

### Bulk Email
| Method | Endpoint               | Access             |
|--------|------------------------|--------------------|
| GET    | `/api/mail/recipients`  | Admin             |
| POST   | `/api/mail/send`        | Admin (password-verified) |

---

## 🛡️ Security

- **bcrypt** password hashing (12 rounds)
- **JWT** access + refresh tokens
- **Role-based** authorization middleware
- **Rate limiting** on auth endpoints
- **Helmet** HTTP security headers
- **Joi** request validation
- **Audit logging** of all admin actions

---

## 📦 Tech Stack

| Layer      | Technology                                 |
|------------|--------------------------------------------|
| Frontend   | React 18, Vite, TailwindCSS 3, Chart.js   |
| Backend    | Node.js, Express, JWT, Joi, Winston        |
| Email      | Resend (bulk email with HTML templates)    |
| Database   | MongoDB, Mongoose                          |
| QR Scanner | html5-qrcode                               |
| Deploy     | Docker, Nginx, Vercel, Render              |

---

## 🎨 Architecture — Unified Portal

The frontend is a **single React app** with role-based routing:

- **Login page** — choose Admin or Coordinator role, then enter credentials
- **Admin view** — gold/amber theme, dark sidebar, full dashboard with analytics, event/user/coordinator management, payments, audit logs, data export
- **Coordinator view** — cyan/teal theme, clean top navbar, assigned events dashboard, participant lists, QR ticket scanner

Pages from `admin/src/` and `coordinator/src/` are imported via Vite aliases (`@admin`, `@coordinator`) into the unified app, sharing a single `AuthContext` and API client.

---

## 📝 License

This project is for educational and organizational use for the Lakshya Tech-Fest.
