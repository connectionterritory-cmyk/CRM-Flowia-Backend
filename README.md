# CRM Servicio MVP

**CRM MVP en español, mobile-first** para gestión de clientes, cuentas por cobrar, órdenes, pagos y seguimiento.

## Tecnologías
- **Backend**: Node.js + Express + Postgres (Supabase)
- **Frontend**: React (Vite) + Tailwind CSS

## Instalación y Ejecución

1. **Instalar Dependencias**
   ```bash
   npm run install:all
   ```

2. **Inicializar Base de Datos**
   ```bash
   npm run migrate
   npm run seed
   ```

3. **Iniciar Servidor de Desarrollo**
   ```bash
   npm run dev
   ```
   - Frontend and Backend ports are assigned dynamically if defaults (5173/3000) are in use.
   - Check the console output for the actual URLs.

## Environment Variables (Supabase)

For production, database credentials live in Supabase and are injected into the backend environment at runtime.

- Set `SUPABASE_DB_URL` in the backend environment (Supabase direct connection URI).
- Optional: `DB_SSL=false` to disable SSL (default is SSL on).
- Keep `.env` local only; it is ignored by git.

## Troubleshooting

If you encounter issues, run the built-in doctor script to check system health:

```bash
npm run doctor
```

This will verify:
- Backend port (3000) is active
- Frontend port (5173) is active
- API is responding correctly

**Common Fixes:**
- **Ports not active**: Ensure `npm run dev` is running in a separate terminal.
- **Database errors**: Run `npm run migrate` to reset the database schema.

## Deploy (cPanel)

### Frontend (crm.flowiadigital.com)
1. Build locally:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
2. Upload `frontend/dist` contents to `crm.flowiadigital.com` (document root).
3. Ensure `.htaccess` includes SPA fallback:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

### Backend (api.flowiadigital.com)
1. Upload backend to `api.flowiadigital.com`.
2. Node.js App settings:
   - Node version: `18.20.8`
   - Startup file: `src/server.js`
3. Environment variables:
    - `NODE_ENV=production`
    - `SUPABASE_DB_URL=<supabase_connection_url>`
    - `DB_SSL=false` (optional)
    - `CORS_ORIGIN=https://crm.flowiadigital.com`
    - `JWT_SECRET=<secret>`
    - `JWT_EXPIRATION=8h`
4. Install dependencies:
   ```bash
   source /home/flowwvlz/nodevenv/api.flowiadigital.com/18/bin/activate
   cd /home/flowwvlz/api.flowiadigital.com
   rm -rf node_modules package-lock.json
   npm install
   ```
5. Health check:
   - `https://api.flowiadigital.com/api/health`

### Compatibility pins (older GLIBC)
- `better-sqlite3`: `7.6.2`
- `pdf-parse`: `1.1.1`
- `uuid`: `8.3.2`
- `overrides`: `pdfjs-dist: 4.8.69`

## Cleanup (Server)
- Remove upload artifacts: `dist.zip`, `backend.zip`.
- Remove unused folders (e.g. old `dist/` copies).
- Keep `crm.db` if you want to preserve data.
