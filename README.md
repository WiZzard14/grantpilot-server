# GrantPilot Server

Express, TypeScript, MongoDB and Agentic AI API for GrantPilot AI.

```powershell
npm install --no-audit --no-fund
npm run dev
```

The server automatically upserts the demo account, sourced scholarship programme records and original articles on startup.

Environment file: `.env`

The server environment supports optional `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, and `ADMIN_IMAGE` values. When present, the startup seed upserts an administrator account.
