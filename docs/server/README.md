# Bolt Nexus Server — Quickstart

This small Express server provides three helpful endpoints for the Bolt Nexus MVP:

- `POST /api/airtable/find-or-create-user` — find a user by Email or create one in Airtable (proxy to keep API key server-side)
- `POST /api/razorpay/create-order` — create a Razorpay order server-side and return order info for client Checkout
- `POST /api/razorpay/webhook` — receive Razorpay webhooks and verify signature; updates Airtable Booking record when a payment is captured

Prereqs
- Node 16+ and npm
- Airtable base and API key
- Razorpay key_id and key_secret

Install

```powershell
cd server
npm install
cp .env.example .env
# edit .env and fill keys
npm start
```

Endpoints

1) Find or create user
POST /api/airtable/find-or-create-user
Body: { name, email, phone, city, memberstackId }
Returns the Airtable record (existing or newly created).

2) Create Razorpay order
POST /api/razorpay/create-order
Body: { amount, currency, receipt, notes }
- amount must be in paise (e.g., ₹799 => amount: 79900)
- returns the Razorpay order object and your public `key_id` for client-side Checkout

3) Webhook
POST /api/razorpay/webhook
- Configure this URL in Razorpay dashboard. The server verifies `x-razorpay-signature` and updates the corresponding Airtable booking if the `notes.bookingId` or `receipt` contains an Airtable Booking record id (rec...)

Security notes
- Keep `.env` private and never commit it.
- Ensure this server runs under HTTPS in production. If using Vercel/Netlify, convert to serverless functions (index.js logic can be adapted).

Next steps
- Deploy to Vercel or Netlify. Set environment variables in the provider dashboard.
- Update frontend `app.js` to POST to `/api/razorpay/create-order` to receive the order ID and then call Razorpay Checkout with `order_id`.
- In Razorpay dashboard, set the webhook URL to `/api/razorpay/webhook` and enable `payment.captured` event.

Netlify deployment
------------------
- If you prefer Netlify, serverless functions are available in `server/netlify`.
- Netlify will publish these functions under `/.netlify/functions/<name>` after you add the environment variables in the Site Settings.
- Ensure you set the same environment variables described in `.env.example` in the Netlify UI.

Vercel deployment
-----------------
- The `vercel.json` in the repository maps `/api/*` routes to the `server/vercel` functions.
- Set environment variables in Vercel project settings and deploy the repo. Functions will be available at `/api/*`.

Files provided for deployment
- `server/vercel/*.js` — Vercel functions
- `server/netlify/*.js` — Netlify functions

Local webhook testing
- Use `ngrok` to expose your local Express server for webhook testing. Configure Razorpay and Memberstack webhooks to point to your ngrok URL.

Notes & troubleshooting
- Ensure the webhook URL is HTTPS.
- If you use Netlify, function timings are short — ensure your Airtable updates are simple patches (they are quick) and handle retries.
- Never commit `.env` or secrets to source control.

