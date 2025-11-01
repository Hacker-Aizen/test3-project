# Zapier workflows — Typeform → Sheets → Airtable → Notifications (Twilio/Email) → Frontend

This document lists step-by-step Zap examples to implement the end-to-end flow.

Workflow A — Diagnostic submission (Typeform) -> Compute (Google Sheets) -> Persist (Airtable) -> Notify

1) Trigger: Typeform — New Entry
   - Typeform fields: name, phone, email, city, appliance, brand_model, year, hours, months_since_service, photo

2) Action: Create Spreadsheet Row (Google Sheets)
   - Write all fields into a Google Sheet that contains the formulas from `sheets_formulas.md`.

3) Action: Delay For 10 seconds (allows Sheets to compute)

4) Action: Lookup Spreadsheet Row (Google Sheets)
   - Retrieve the computed columns `EstimatedLossINR` and `HealthScore` (O and P).

5) Action: Create/Find Record (Airtable) — Users table
   - Use email or phone to find existing user; if not found, create user record. Store MemberstackID later when user signs up.

6) Action: Create Record (Airtable) — Appliances table
   - Link to the User record; set `EstimatedLossPerMonth` = EstimatedLossINR, `HealthScore` = HealthScore. Attach photo if present (Typeform can provide an URL).

7) Action: Send Email (Gmail/SendGrid)
   - Send diagnostic result email to user with the computed ₹ and a link to result page (frontend) including query params or a short token.

8) Action: Webhook POST (optional) to frontend serverless endpoint
   - Notify frontend / app backend with payload to trigger any further actions, e.g. push notification or webhook to Memberstack.

9) Action: Twilio — Send SMS to user (optional) and to technician (admin phone) with booking/diagnostic summary.

Important implementation notes:
- Use "Find or Create" pattern for Users so duplicate users are minimized.
- To connect Zapier <-> Airtable securely, use Zapier's Airtable integration.
- For result page deep-linking: generate a short token in Airtable and include in email; the frontend can use that to fetch the appliance row and show animated results.

Workflow B — Calendly booking -> Airtable Booking -> Twilio notifications

1) Trigger: Calendly — Invitee Created (when user books)
2) Action: Webhooks by Zapier (POST) -> Create a Booking record in Airtable (map fields: invitee email -> User lookup, event time -> ScheduledAt, service type -> Booking.ServiceType)
3) Action: Twilio — Send SMS to technician and to user with booking details

Workflow C — Razorpay payment -> Webhook -> Airtable update

1) Razorpay Checkout/Payment completed: Razorpay will hit your configured webhook
2) Your server verifies signature and updates Airtable Booking record PaymentStatus = Paid and BookingStatus = Confirmed (use Airtable API)
3) Optionally notify user via Email/Twilio and assign technician via Airtable Automation

Webhook payload examples
- Typeform -> Zapier: Zapier handles that automatically
- Zapier -> Frontend webhook (example):
  POST /hooks/diagnostic
  Content-Type: application/json
  Body: {"user_email":"a@b.com","appliance_id":"recXXXX","loss_inr":450,"score":72}

Security
- Never expose API keys in client-side code. Use serverless endpoints for write operations to Airtable & for Razorpay order creation.
- Use signed tokens for deep links to result pages so random users can't fetch other users' data.

