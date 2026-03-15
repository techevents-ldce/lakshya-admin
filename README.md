# 🎯 Lakshya — College Tech-Fest Management System

A production-ready **MERN stack** application for managing the **Lakshya** college tech-fest. Features two internal portals — Admin and Coordinator — connected to a shared Node.js/Express REST API with MongoDB.

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
├── client/
│   ├── admin/               # React Admin Portal (Vite + TailwindCSS)
│   │   ├── src/pages/       # 11 pages (Dashboard, Events, Users, etc.)
│   │   └── Dockerfile
│   └── coordinator/         # React Coordinator Portal (Vite + TailwindCSS)
│       ├── src/pages/       # 4 pages (Dashboard, Participants, QR Scanner)
│       └── Dockerfile
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
npm run seed                 # Creates admin: admin@lakshya.com / Admin@1234
npm run dev                  # Runs on http://localhost:5000
```

### 2. Admin Portal

```bash
cd client/admin
npm install
npm run dev                  # Runs on http://localhost:5173
```

### 3. Coordinator Portal

```bash
cd client/coordinator
npm install
npm run dev                  # Runs on http://localhost:5174
```

---

## 🔑 Default Admin Credentials

| Field    | Value              |
|----------|--------------------|
| Email    | admin@lakshya.com  |
| Password | Admin@1234         |

> Run `npm run seed` in the `server/` directory to create this account.

---

## 🐳 Docker Deployment

```bash
# From project root
cp server/.env.example server/.env  # Configure env vars
docker-compose up --build

# Access:
#   API:          http://localhost/api/health
#   Admin:        http://localhost:3000
#   Coordinator:  http://localhost:3001
#   Via Nginx:    http://localhost (reverse proxy)
```

---

## ☁️ Cloud Deployment

### Backend → Render.com
1. Push to GitHub
2. Create a new **Web Service** on Render
3. Set root directory to `server/`
4. Set environment variables: `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ALLOWED_ORIGINS`

### Frontend → Vercel
1. Deploy `client/admin` as a separate Vercel project
2. Deploy `client/coordinator` as a separate Vercel project
3. Set `VITE_API_URL` environment variable to your Render backend URL (e.g., `https://lakshya-api.onrender.com/api`)

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
| `ALLOWED_ORIGINS`     | CORS origins (comma-separated) | http://localhost:5173,http://localhost:5174 |
| `RATE_LIMIT_WINDOW_MS`| Rate limit window              | 900000 (15 min)        |
| `RATE_LIMIT_MAX`      | Max requests per window        | 20                     |

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
| Database   | MongoDB, Mongoose                          |
| QR Scanner | html5-qrcode                               |
| Deploy     | Docker, Nginx, Vercel, Render              |

---

## 📝 License

This project is for educational and organizational use for the Lakshya Tech-Fest.
