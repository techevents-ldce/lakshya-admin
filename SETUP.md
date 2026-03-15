# 🚀 Lakshya Tech-Fest — Local Setup Guide

Follow this guide **step by step** to run the entire Lakshya project on your computer.  
No prior development experience required — just follow along carefully.

---

## 📋 Table of Contents

1. [What You Need to Install First](#1--what-you-need-to-install-first)
2. [Download the Project](#2--download-the-project)
3. [Set Up the Backend Server](#3--set-up-the-backend-server)
4. [Set Up the Admin Panel](#4--set-up-the-admin-panel)
5. [Set Up the Coordinator Panel](#5--set-up-the-coordinator-panel)
6. [Create the First Admin & Coordinator Users](#6--create-the-first-admin--coordinator-users)
7. [Run Everything Together](#7--run-everything-together)
8. [Login Credentials](#8--login-credentials)
9. [Docker Setup (Optional)](#9--docker-setup-optional-alternative)
10. [Common Problems & Fixes](#10--common-problems--fixes)
11. [Project Structure](#11--project-structure)

---

## 1. 🛠 What You Need to Install First

You need **3 things** installed on your computer before starting. Follow each link, download, and install.

### a) Node.js (version 18 or higher)

1. Go to 👉 [https://nodejs.org](https://nodejs.org)
2. Click the **LTS** (recommended) download button
3. Run the installer → click **Next** on every screen → click **Install** → click **Finish**
4. **Verify it worked:** Open a terminal and type:

```bash
node --version
```

You should see something like `v18.x.x` or `v20.x.x`. If the number starts with 18 or higher, you're good.

> **💡 How to open a terminal:**
> - **Windows:** Press `Win + R`, type `cmd`, press Enter. Or search for "Command Prompt" or "PowerShell" in Start Menu.
> - **Mac:** Press `Cmd + Space`, type `Terminal`, press Enter.
> - **Linux:** Press `Ctrl + Alt + T`.

### b) MongoDB (the database)

You have **two options** — pick whichever is easier for you:

#### Option A: MongoDB Atlas (Cloud — Recommended for beginners, no installation needed)

1. Go to 👉 [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Click **Try Free** → Create an account
3. Create a free cluster (choose the **FREE** tier)
4. Under **Database Access**, create a database user with a username and password (remember these!)
5. Under **Network Access**, click **Add IP Address** → choose **Allow Access from Anywhere** → click Confirm
6. Go to **Database** → click **Connect** → choose **Drivers** → copy the connection string
7. It will look like this:  
   ```
   mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
8. Replace `YOUR_USERNAME` and `YOUR_PASSWORD` with the ones you created in step 4
9. **Save this connection string** — you will need it in Step 3

#### Option B: MongoDB Community Server (Local — Installed on your computer)

1. Go to 👉 [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Select your OS → Download → Install with all default settings
3. Make sure MongoDB is running (it usually starts automatically after install)
4. Your connection string will be:
   ```
   mongodb://localhost:27017/lakshya
   ```

### c) Git (to download the project)

1. Go to 👉 [https://git-scm.com/downloads](https://git-scm.com/downloads)
2. Download for your OS → Install with all default settings
3. **Verify it worked:**

```bash
git --version
```

You should see something like `git version 2.x.x`.

---

## 2. 📥 Download the Project

Open your terminal and run these commands one by one:

```bash
git clone <YOUR_REPOSITORY_URL>
```

> **⚠️ Replace `<YOUR_REPOSITORY_URL>`** with the actual GitHub/GitLab URL of this project.  
> Example: `git clone https://github.com/your-username/lakshya-admin.git`

Then enter the project folder:

```bash
cd lakshya-admin
```

> **Note:** The folder name depends on the repository name. Use whatever folder was created.

---

## 3. 🖥️ Set Up the Backend Server

### Step 3.1 — Go to the server folder

```bash
cd server
```

### Step 3.2 — Install dependencies

```bash
npm install
```

> This will take 1–2 minutes. Wait for it to finish. You will see a `node_modules` folder created.

### Step 3.3 — Create the environment file

You need to create a file called `.env` in the `server` folder with your secret settings.

**On Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**On Mac/Linux:**
```bash
cp .env.example .env
```

### Step 3.4 — Edit the `.env` file

Open the `.env` file in any text editor (Notepad, VS Code, etc.) and update these values:

```env
NODE_ENV=development
PORT=5000

# MongoDB — paste YOUR connection string from Step 1b
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority

# JWT Secrets — change these to any random text (keep them secret!)
JWT_SECRET=my_super_secret_key_12345
JWT_REFRESH_SECRET=my_refresh_secret_key_67890
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# CORS Origins — DO NOT change these unless you know what you're doing
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174

# Rate Limiting — leave as default
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=20

# Admin account that will be created by the seed script
SEED_ADMIN_EMAIL=admin@lakshya.com
SEED_ADMIN_PASSWORD=Admin@1234

# Coordinator account that will be created by the seed script
SEED_COORD_EMAIL=coordinator@lakshya.com
SEED_COORD_PASSWORD=Coord@1234
```

> **⚠️ IMPORTANT:** The only line you MUST change is `MONGO_URI`. Paste the connection string you got from Step 1b.  
> If you installed MongoDB locally, use: `mongodb://localhost:27017/lakshya`

### Step 3.5 — Test the server

```bash
npm run dev
```

You should see output like:

```
Lakshya API running on port 5000
Connected to MongoDB
```

> **✅ If you see this, the backend is working!** Press `Ctrl + C` to stop it for now.  
> **❌ If you see an error**, check the [Common Problems](#10--common-problems--fixes) section below.

### Step 3.6 — Go back to the main project folder

```bash
cd ..
```

---

## 4. 🛡️ Set Up the Admin Panel

### Step 4.1 — Go to the admin folder

```bash
cd client/admin
```

### Step 4.2 — Install dependencies

```bash
npm install
```

> Wait for it to finish (1–2 minutes).

### Step 4.3 — Test the admin panel

```bash
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

> **✅ If you see this, the admin panel is working!** Press `Ctrl + C` to stop it for now.

### Step 4.4 — Go back to the main project folder

```bash
cd ../..
```

---

## 5. 📋 Set Up the Coordinator Panel

### Step 5.1 — Go to the coordinator folder

```bash
cd client/coordinator
```

### Step 5.2 — Install dependencies

```bash
npm install
```

> Wait for it to finish (1–2 minutes).

### Step 5.3 — Test the coordinator panel

```bash
npm run dev
```

You should see:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5174/
```

> **✅ If you see this, the coordinator panel is working!** Press `Ctrl + C` to stop it for now.

### Step 5.4 — Go back to the main project folder

```bash
cd ../..
```

---

## 6. 🌱 Create the First Admin & Coordinator Users

Before you can log in, you need to create the initial accounts in the database.

### Step 6.1 — Go to the server folder

```bash
cd server
```

### Step 6.2 — Run the seed script

```bash
npm run seed
```

You should see:

```
Connected to MongoDB
Admin created  : admin@lakshya.com / Admin@1234
Coordinator created: coordinator@lakshya.com / Coord@1234
Seed complete.
```

> **✅ Your accounts are now created!**

### Step 6.3 — Go back to the main project folder

```bash
cd ..
```

---

## 7. ▶️ Run Everything Together

You need to run **3 terminals at the same time** — one for each part of the project.

### Terminal 1 — Backend Server

```bash
cd server
npm run dev
```

> Keep this terminal open and running. You should see `Lakshya API running on port 5000`.

### Terminal 2 — Admin Panel

Open a **new** terminal window, then:

```bash
cd client/admin
npm run dev
```

> Keep this terminal open and running. Admin panel runs on **http://localhost:5173**

### Terminal 3 — Coordinator Panel

Open another **new** terminal window, then:

```bash
cd client/coordinator
npm run dev
```

> Keep this terminal open and running. Coordinator panel runs on **http://localhost:5174**

### 🎉 Open in your browser

| App                | URL                          |
|--------------------|------------------------------|
| **Admin Panel**     | http://localhost:5173         |
| **Coordinator Panel** | http://localhost:5174      |
| **API Health Check** | http://localhost:5000/api/health |

---

## 8. 🔑 Login Credentials

Use these credentials to log in (created by the seed script in Step 6):

| Role         | Email                     | Password       |
|--------------|---------------------------|----------------|
| **Admin**    | `admin@lakshya.com`       | `Admin@1234`   |
| **Coordinator** | `coordinator@lakshya.com` | `Coord@1234`   |

> **Admin Panel** → Log in with the Admin credentials at http://localhost:5173  
> **Coordinator Panel** → Log in with the Coordinator credentials at http://localhost:5174

---

## 9. 🐳 Docker Setup (Optional Alternative)

If you have Docker installed, you can run the **entire project with a single command** instead of following Steps 3–7 above.

### Step 9.1 — Install Docker

1. Go to 👉 [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Download and install Docker Desktop
3. Open Docker Desktop and make sure it's running (you'll see the Docker icon in your taskbar)

### Step 9.2 — Create the `.env` file

Follow **Step 3.3 and 3.4** above to create the `server/.env` file.  
For Docker, use this as your `MONGO_URI`:

```
MONGO_URI=mongodb://mongo:27017/lakshya
```

> **Note:** Inside Docker, the MongoDB host is `mongo` (the service name), not `localhost`.

### Step 9.3 — Run with Docker

From the **root project folder** (not server, not client), run:

```bash
docker-compose up --build
```

> This will take 3–5 minutes the first time. It downloads and builds everything automatically.

Once you see all services running, open your browser:

| App                | URL                  |
|--------------------|----------------------|
| **Full App (Nginx)**| http://localhost:80  |
| **API Direct**      | http://localhost:5000 |

### Step 9.4 — Seed the database (Docker)

After the containers are running, open a **new terminal** and run:

```bash
docker-compose exec server node src/scripts/seed.js
```

### Step 9.5 — Stop Docker

```bash
docker-compose down
```

To also delete the database data:

```bash
docker-compose down -v
```

---

## 10. 🔧 Common Problems & Fixes

### ❌ `npm: command not found`

**Cause:** Node.js is not installed or not in your PATH.  
**Fix:** Re-install Node.js from [https://nodejs.org](https://nodejs.org). During installation, make sure the option **"Add to PATH"** is checked. Then **restart your terminal**.

---

### ❌ `npm install` shows errors about Python or node-gyp

**Cause:** Some packages need build tools.  
**Fix (Windows):** Open PowerShell **as Administrator** and run:

```powershell
npm install -g windows-build-tools
```

**Fix (Mac):** Run:

```bash
xcode-select --install
```

---

### ❌ `MongoNetworkError` or `ECONNREFUSED` when starting the server

**Cause:** Cannot connect to MongoDB.  
**Fix:**
1. Check your `MONGO_URI` in `server/.env` — make sure it's correct
2. If using **MongoDB Atlas**: Make sure you added your IP in **Network Access → Allow Access from Anywhere**
3. If using **local MongoDB**: Make sure MongoDB is running. On Windows, check if the `MongoDB` service is started in the Services app (`Win + R` → type `services.msc` → find MongoDB → Start)

---

### ❌ `Error: listen EADDRINUSE: address already in use :::5000`

**Cause:** Port 5000 is already being used by another program.  
**Fix (Windows):**

```powershell
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

Replace `<PID_NUMBER>` with the number shown in the output.

**Fix (Mac/Linux):**

```bash
lsof -i :5000
kill -9 <PID>
```

---

### ❌ Admin or Coordinator panel shows a blank page or an error

**Cause:** The backend server is not running.  
**Fix:** Make sure **Terminal 1** (the server) is running with `npm run dev` **before** opening the panels in the browser. The frontend needs the backend API to work.

---

### ❌ `Module not found` error when starting any app

**Cause:** Dependencies were not installed.  
**Fix:** Go to the folder that shows the error and run:

```bash
npm install
```

---

### ❌ Login says "Invalid email or password"

**Cause:** The seed script was not run, so no users exist.  
**Fix:** Run the seed script (Step 6):

```bash
cd server
npm run seed
```

---

### ❌ CORS error in browser console

**Cause:** The `ALLOWED_ORIGINS` in `server/.env` does not match the frontend URLs.  
**Fix:** Make sure your `server/.env` has:

```
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

No spaces after the comma. No trailing slash after the port number.

---

## 11. 📁 Project Structure

```
lakshya-admin/
│
├── server/                   ← Backend API (Node.js + Express + MongoDB)
│   ├── src/
│   │   ├── config/           ← Database configuration
│   │   ├── controllers/      ← Request handlers
│   │   ├── middleware/       ← Auth, error handling, validation
│   │   ├── models/           ← Database schemas (Mongoose)
│   │   ├── routes/           ← API route definitions
│   │   ├── services/         ← Business logic
│   │   ├── utils/            ← Helper functions
│   │   ├── validations/      ← Input validation schemas (Joi)
│   │   ├── scripts/          ← Seed script
│   │   ├── app.js            ← Express app setup
│   │   └── server.js         ← Server entry point
│   ├── .env                  ← Your secret settings (DO NOT share)
│   ├── .env.example          ← Template for .env
│   └── package.json
│
├── client/
│   ├── admin/                ← Admin Panel (React + Vite + TailwindCSS)
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── coordinator/          ← Coordinator Panel (React + Vite + TailwindCSS)
│       ├── src/
│       ├── package.json
│       └── vite.config.js
│
├── docker-compose.yml        ← Docker setup (optional)
├── nginx/                    ← Nginx config for Docker
├── SETUP.md                  ← ⭐ This file
└── README.md                 ← Project overview
```

---

## 🎯 Quick Command Reference

| Action                       | Command                                     | Where to run     |
|------------------------------|---------------------------------------------|------------------|
| Install server dependencies  | `npm install`                               | `server/`        |
| Install admin dependencies   | `npm install`                               | `client/admin/`  |
| Install coord dependencies   | `npm install`                               | `client/coordinator/` |
| Start backend server         | `npm run dev`                               | `server/`        |
| Start admin panel            | `npm run dev`                               | `client/admin/`  |
| Start coordinator panel      | `npm run dev`                               | `client/coordinator/` |
| Create initial users         | `npm run seed`                              | `server/`        |
| Run everything (Docker)      | `docker-compose up --build`                 | Project root     |
| Stop Docker                  | `docker-compose down`                       | Project root     |

---

> **Need help?** If something doesn't work after following all the steps, take a screenshot of the error and share it with the project maintainer.
