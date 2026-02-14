# cPanel nodevenv dependencies

Target app root: /home/flowwvlz/CRM-Flowia-Backend/backend

## Install and verify
1) Confirm the cPanel Node.js Application Root points to the backend folder.
2) Open Terminal (or SSH) and run:

```bash
cd /home/flowwvlz/CRM-Flowia-Backend/backend
npm install --omit=dev
npm ls @supabase/supabase-js
node -e "require('@supabase/supabase-js'); console.log('supabase-js ok')"
```

## If MODULE_NOT_FOUND persists
- Rebuild the nodevenv from cPanel and re-run npm install in the same Application Root.
- Ensure no other Node.js app points to a different root using the same vhost.
