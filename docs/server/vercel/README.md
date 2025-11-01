# Vercel Serverless functions for Bolt Nexus

This folder contains three serverless endpoints that mirror the Express server functionality and are ready for Vercel deployment.

Files
- `create-order.js` — POST to create a Razorpay order server-side. Returns {ok:true, order, key_id}
- `webhook.js` — Razorpay webhook receiver/verifier. Verifies signature and updates Airtable Booking record.
- `find-or-create-user.js` — Find or create a user in Airtable by email.

Environment variables (set in Vercel dashboard)
- AIRTABLE_API_KEY
- AIRTABLE_BASE_ID
- AIRTABLE_USERS_TABLE (optional, default: Users)
- AIRTABLE_BOOKINGS_TABLE (optional, default: Bookings)
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET

To deploy
1. Push this repo to GitHub
2. Import the repo into Vercel
3. Set environment variables in the Vercel project settings
4. Deploy — the functions will be available under `/api/create-order`, `/api/webhook`, `/api/find-or-create-user`

Notes
- For webhook configuration in Razorpay, use the Vercel function URL for `/api/webhook` and set the events to include `payment.captured` and `order.paid`.
- Keep secrets in Vercel environment settings and never commit them.
