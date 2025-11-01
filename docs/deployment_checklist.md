# Deployment Checklist — Vercel & Netlify

This checklist helps you deploy the serverless functions and frontend for Bolt Nexus.

Common env vars (required for both Vercel & Netlify)
- AIRTABLE_API_KEY
- AIRTABLE_BASE_ID
- AIRTABLE_USERS_TABLE (optional, default: Users)
- AIRTABLE_BOOKINGS_TABLE (optional, default: Bookings)
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- PORT (only for local Express)

Vercel deployment (recommended)
1. Push the repo to GitHub.
2. Create a new project in Vercel and import the repo.
3. In Project Settings -> Environment Variables, add the env vars listed above.
4. Deploy. The functions live at:
   - /api/create-order
   - /api/webhook
   - /api/find-or-create-user
   - /api/confirm
5. Configure Razorpay webhooks to point to: `https://<your-vercel-domain>/api/webhook` and enable `payment.captured` and `order.paid`.
6. Configure Memberstack webhooks to point to: `https://<your-vercel-domain>/api/memberstack/webhook`.

Netlify deployment (alternative)
1. Push the repo to GitHub.
2. Create a new site from Git in Netlify and link the repo.
3. In Site settings -> Build & Deploy -> Environment, add the env vars listed above.
4. Netlify will automatically detect functions in `server/netlify` and deploy them. The endpoints will be available under `/.netlify/functions/<name>` e.g.:
   - `/.netlify/functions/create-order`
   - `/.netlify/functions/webhook`
   - `/.netlify/functions/find-or-create-user`
   - `/.netlify/functions/confirm`
5. Configure Razorpay webhook URL in your Razorpay dashboard to `https://<your-netlify-site>/.netlify/functions/webhook`.
6. Configure Memberstack webhook to `https://<your-netlify-site>/.netlify/functions/memberstack` (if you add a memberstack handler function; the Express/VerceL memberstack endpoint is available only if you deploy the Express server — otherwise use functions and create a memberstack function).

Local testing with ngrok (for webhooks)
1. Start the Express server locally:
```powershell
cd "c:\Users\Admin\Desktop\Content (Collage)\Sem 5\Final Adapt\server"
npm install
copy .env.example .env
# edit .env
npm start
```
2. Start ngrok to forward a public URL to your local server (install ngrok separately):
```powershell
ngrok http 3000
```
3. Configure Razorpay webhook to point to the ngrok URL + `/api/razorpay/webhook`.

Notes & troubleshooting
- Ensure the webhook URL is HTTPS.
- If you use Netlify, function timings are short — ensure your Airtable updates are simple patches (they are quick) and handle retries.
- Never commit `.env` or secrets to source control.
