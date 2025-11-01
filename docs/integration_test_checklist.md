# End-to-End Integration Test Checklist — Bolt Nexus MVP

Run these checks after you deploy functions and configure integrations. Mark each step PASS/FAIL and capture any logs.

1) Typeform -> Sheets -> Zapier -> Airtable -> Email
- Step: Submit a diagnostic through Typeform (or use the local diagnostic modal to simulate).
- Verify: A new row in Google Sheets is created, computed columns (EstimatedLossINR & HealthScore) are present.
- Verify: Zapier reads computed values and creates/finds a User in Airtable and creates an Appliance record linked to that user.
- Verify: The user receives a diagnostic email with the result link.

2) Result page deep-linking
- Step: Click the result link from the email.
- Verify: Frontend retrieves the appliance record (via secure serverless endpoint or token) and shows animated ₹ and health score that match Sheets computation.

3) Memberstack signup/linking
- Step: Sign up as a new user through Memberstack.
- Verify: Memberstack webhook calls `/api/memberstack/webhook` and either creates or updates an Airtable User record with `MemberstackID` populated.
- Verify: Logging in refreshes dashboard and shows user's appliances (via `find-or-create-user` server call used by frontend).

4) Scheduling via Calendly -> Zapier -> Airtable -> Twilio
- Step: Use the frontend "Schedule" button to open Calendly with prefilled email and phone; complete a booking.
- Verify: Zapier receives `Invitee Created`, finds/creates the User in Airtable, and creates a `Bookings` record with BookingStatus = Scheduled and PaymentStatus = Pending.
- Verify: Twilio sends SMS to the user and to the assigned technician with booking details.

5) Razorpay payment flow (client + server + webhook)
- Step: From a plan card, click "Buy AMC" and proceed to payment on Razorpay Checkout.
- Verify (client): The frontend POSTs to `/api/razorpay/create-order` to create an order; Checkout opens and completes.
- Verify (client): After success, frontend posts `razorpay_payment_id, razorpay_order_id, razorpay_signature` to `/api/razorpay/confirm`.
- Verify (server): `/api/razorpay/confirm` validates signature and updates the linked Airtable Booking record (PaymentStatus=Paid), if `notes.bookingId` was set when creating the order.
- Verify (server webhook): Razorpay webhook `/api/webhook` also receives the event and (as a backup) updates Airtable.

6) Technician dashboard workflow
- Step: Technician opens Airtable Interface filtered to assigned technician.
- Verify: Technician sees assigned jobs, can set BookingStatus to "Done" and add AfterServiceNotes.
- Verify: Airtable Automation sends an email to the user: "Service complete — confirm satisfaction." and optionally updates appliance records.

7) Notifications & error handling
- Verify: Emails and SMS are sent only when expected and contain the correct booking IDs and contact details.
- Verify: Zapier task history shows no failures; where failures exist, check logs and add retries or alerts.

Debugging tips
- Use Zapier task history to inspect payloads and outputs for each step.
- For webhooks, check the provider's webhook logs (Razorpay has a webhook delivery log).
- For serverless function errors, check Vercel/Netlify function logs for stack traces.
- For Airtable API errors, confirm the Base ID and API key and that table names match exactly.

Optional smoke tests (scriptable)
- Write a small Postman collection or Node script to POST sample Typeform payloads to your Zapier webhook URL and to call your server endpoints to validate responses.

Acceptance
- All the above flows should complete end-to-end without manual fixes. If any external service requires manual mapping (e.g., Airtable link fields), note that as part of the fix list.
