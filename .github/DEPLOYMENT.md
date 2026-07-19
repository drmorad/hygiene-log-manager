# One-click deployment setup

This repo now includes a GitHub Actions workflow at .github/workflows/deploy.yml.

## Required GitHub secrets

أضف هذه القيم في GitHub → Settings → Secrets and variables → Actions:

- DATABASE_URL: سلسلة الاتصال بقاعدة البيانات PostgreSQL (مثل Supabase أو أي مزود PostgreSQL)
- RENDER_API_KEY: مفتاح API الخاص بـ Render
- RENDER_SERVICE_ID: معرف خدمة Render
- NETLIFY_AUTH_TOKEN: رمز الوصول الشخصي الخاص بـ Netlify
- NETLIFY_SITE_ID: معرف الموقع الخاص بـ Netlify

## Optional GitHub variables

- VITE_API_URL: عنوان API العام الخاص بك، مثل https://rewaya-hygiene-api.onrender.com

## Deploy flow

1. Push this repo to GitHub.
2. Add the secrets above.
3. Open Actions → Deploy → Run workflow.
4. The workflow will build the API and web app, run the DB migration, and deploy both.
