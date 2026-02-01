# ShadowLink Deployment Guide

## Development Mode

In development, frontend and backend run **separately**:

```
Frontend: http://localhost:3000 (React dev server)
Backend:  http://localhost:3000 (Express API)
```

**To restart both:**
- Run `restart.ps1` (PowerShell)
- Or run `start.bat` (double-click)

---

## Production Mode

In production, frontend is **built** and served by backend:

```
Backend:  http://your-domain.com:3000
          (Serves both API AND static frontend files)
```

**Deployment steps:**

1. **Build frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start backend (serves built frontend):**
   ```bash
   cd backend
   node server.js
   ```

**To restart production:**
- Run `restart-production.ps1`
- This builds frontend + restarts backend
- Website runs on single port (3000)

---

## Docker Deployment

Use `docker-compose.yml` for containerized deployment:

```bash
# Start
docker-compose up -d

# Restart (after code changes)
docker-compose down
docker-compose up -d

# View logs
docker-compose logs -f
```

Docker handles everything - no need for separate frontend server.

---

## Summary

| Mode | Frontend Server | Backend Server | Restart Command |
|------|-----------------|----------------|-----------------|
| Development | Separate (npm start) | node server.js | `restart.ps1` |
| Production | Built into backend | node server.js | `restart-production.ps1` |
| Docker | Built into backend | Docker container | `docker-compose restart` |
