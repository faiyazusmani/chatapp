# ChatApp

Real-time chat application — React (Vite) frontend, Node.js/Express + Socket.io backend, MongoDB (Atlas).

## ✨ Features

- Real-time messaging (Socket.io) with typing indicators, edit/delete, reactions
- File uploads (Cloudinary or local storage) with magic-byte validation
- Voice notes, audio playback, voice/video calls (WebRTC)
- Rooms with roles (owner/admin/moderator/member), invite codes & links
- Starred messages, "hide for me", multi-select actions, reply navigation
- Dark / Light / System themes with WCAG-AA contrast
- Offline queue: messages sent while disconnected are delivered on reconnect
- Desktop notifications, per-room unread badges, tab-title unread counter
- Fully responsive (320px → 4K), safe-area aware

## 🏗 Architecture

```
chatApp/
├── backend/    Express API + Socket.io server (port 5000)
│   ├── models/         Mongoose schemas (User, Room, Message, CallHistory)
│   ├── controllers/    Route handlers
│   ├── middleware/     auth, error mapping, upload (magic-byte validation)
│   ├── socket/         Socket.io connection + presence handlers
│   └── utils/          logger, JWT, Cloudinary
├── frontend/   React 18 + Vite SPA (port 5173 dev)
│   └── src/    components, contexts, pages, services, utils, styles
├── nginx.conf               Reverse proxy + SPA serving
├── docker-compose.yml       backend + nginx
├── ecosystem.config.cjs     PM2 production config
└── package.json             Workspace scripts
```

## 🚀 Local Development

```bash
# 1. Install dependencies (root, backend, frontend)
npm run install:all

# 2. Configure environment
cp backend/.env.example backend/.env      # fill MONGO_URI, JWT_SECRET, CLIENT_URL
cp frontend/.env.example frontend/.env    # fill VITE_SOCKET_URL

# 3. Run (two terminals)
npm run dev:backend    # http://localhost:5000
npm run dev:frontend   # http://localhost:5173
```

> Windows note: `MONGO_URI=mongodb://localhost:27017/chatroom` needs a local MongoDB; production uses MongoDB Atlas.

## 🔑 Environment Variables

### backend/.env
| Variable | Required | Description |
|---|---|---|
| `PORT` | ✓ | API port (Render sets its own) |
| `NODE_ENV` | ✓ | `development` \| `production` |
| `MONGO_URI` | ✓ | MongoDB connection string |
| `JWT_SECRET` | ✓ | **No fallback in production** — server refuses to boot without it |
| `CLIENT_URL` | ✓ | Frontend origin for CORS |
| `CLOUDINARY_CLOUD_NAME` | – | Cloudinary uploads (empty = local `/uploads`) |
| `CLOUDINARY_API_KEY` | – | |
| `CLOUDINARY_API_SECRET` | – | |

### frontend/.env
| Variable | Required | Description |
|---|---|---|
| `VITE_SOCKET_URL` | ✓ | Backend URL (same-origin `/` in production) |
| `VITE_GOOGLE_CLIENT_ID` | – | Google OAuth |

## 📦 Production

### Option A — Docker Compose (recommended)

```bash
npm run build:frontend      # SPA → frontend/dist
docker compose up -d --build
# App: http://localhost  ·  API: http://localhost:5000
```

### Option B — PM2 + nginx (bare metal)

```bash
npm run build:frontend
npm install -g pm2
pm2 start ecosystem.config.cjs     # backend cluster (NODE_ENV=production)
pm2 save && pm2 startup            # survive reboots
# Serve frontend/dist with nginx (see nginx.conf for proxy rules)
```

### Option C — Render (backend) + Vercel (frontend)

- Backend: push `backend/` (Render blueprint `backend/render.yaml` already included). Set env vars in the dashboard; `JWT_SECRET` auto-generates.
- Frontend: import the repo on Vercel (framework: Vite). `vercel.json` handles SPA rewrites. Set `VITE_SOCKET_URL` to the Render URL **with `wss://`/`https://`**.

> Production checklist: strong `JWT_SECRET`, `NODE_ENV=production`, HTTPS everywhere, rate limits + helmet active (already configured server-side).

## 🧪 Quality Gates

```bash
npm run lint        # backend + frontend (zero errors, zero warnings enforced)
npm run build       # install + production build
```

## 🔒 Security Notes

- JWT auth with **no ghost-user creation** — forged tokens never create accounts
- Upload validation = mimetype **and** magic-byte sniffing (spoofed `.exe` as `.png` rejected)
- Socket connections require auth; sender identity is server-derived (client can't impersonate)
- Helmet CSP, CORS allowlist, per-route rate limits, 25 MB body limit, graceful shutdown
- Messages are encrypted **in transit (TLS)** — not end-to-end encrypted (UI states this accurately)
