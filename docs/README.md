# Bolt Nexus — MVP Frontend & Integration Guide

This folder contains a polished static frontend prototype and integration documentation to implement the Bolt Nexus MVP described in your brief. The frontend is a production-feel static site (HTML/CSS/JS) that demonstrates UI, animations, and wireframes for integrations.

Files added
- `index.html` — Landing, diagnostic modal, results UI, dashboard placeholder, AMC plans.
- `styles.css` — Polished styles and animations with the requested color palette.
- `app.js` — Frontend logic: demo diagnostic compute, animated ₹ and circular health progress, placeholders for Razorpay/Calendly/Memberstack/Airtable integrations.
- `airtable_schema.json` — Airtable schema export for Users, Appliances, Bookings (import into Airtable).
- `sheets_formulas.md` — Google Sheets formulas to compute energy loss & health score.
- `zapier_workflows.md` — Detailed Zapier workflow steps and sample payloads.
- `razorpay_webhook_example.js` — Small Express.js example showing webhook signature verification and how to update Airtable.

How to run locally (static preview)
1. Open `index.html` directly in the browser for a static preview.
2. For a local server (recommended), run a quick static server (eg. Node `http-server` or Python):

   # PowerShell example
   python -m http.server 8000

   Then open `http://localhost:8000/index.html`.

Important security notes
- Do NOT embed Airtable or Razorpay secret keys in client-side code. Always use a small serverless function or backend to hold secret keys and proxy requests.
- Memberstack, Razorpay, Twilio, and Zapier all require their own configuration and API keys — see integration docs below.

Next steps (recommended)
- Import `airtable_schema.json` into your Airtable workspace to create tables.
- Build the Zapier Zaps as documented in `zapier_workflows.md` (Typeform -> Sheets -> Airtable -> Twilio/Gmail -> webhooks).
- Configure Memberstack to protect the dashboard and map MemberstackID to Airtable Users.
- Deploy a tiny server (serverless function) for Razorpay webhooks and for Airtable proxy endpoints.

If you want, I can:
- Generate a serverless function (Azure Functions / Vercel / Netlify) that proxies Airtable and creates Razorpay orders (requires environment variables).
- Produce the exact Zapier webhook payloads and step-by-step screenshots.
- Convert this prototype into a Framer project (export components & assets) if you want a point-and-click design workflow.

