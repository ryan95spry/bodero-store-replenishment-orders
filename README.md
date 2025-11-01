# Bodero Store Replenishment Orders (Next.js)

Hosted-friendly app for uploading POS CSVs, deciding Y/N replenishment per store, and exporting delivery breakdowns.

## Quick Deploy (Vercel)
1. Create a GitHub repo and push this folder to it (or use Vercel CLI).
2. On https://vercel.com/new import your repo. Project name: **bodero-store-replenishment-orders**.
3. Click **Deploy**. No environment variables needed.
4. Your app will be live at `https://<your-project>.vercel.app`.

## Local Dev
```bash
npm install
npm run dev
# open http://localhost:3000
```

## CSV Columns Used
- Store
- Description
- Qty Sold
- Period Start
- Period End
