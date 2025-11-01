# Calendly + Zapier + Twilio — Scheduling & Notifications

Goal
- Embed a Calendly modal that is prefilled with the user's email/phone. When a booking is created, Zapier creates an Airtable `Bookings` record and sends SMS notifications to the user and assigned technician via Twilio.

Calendly embed (client-side)
- Add Calendly's embed script to your page (in `index.html` or via script):

<script src="https://assets.calendly.com/assets/external/widget.js" async></script>

- Open a popup prefilled with user info (call from JS):

function openCalendly(email, name, phone){
  const url = new URL('https://calendly.com/YOUR_USERNAME/YOUR_EVENT');
  if (email) url.searchParams.set('email', email);
  if (name) url.searchParams.set('name', name);
  if (phone) url.searchParams.set('a1', phone); // custom answer field mapping (Calendly uses a1,a2 for custom questions)
  Calendly.initPopupWidget({ url: url.toString() });
}

- Wire this to your "Schedule" buttons and prefill from Memberstack or form data.

Zapier flow (Calendly -> Airtable -> Twilio)
1) Trigger: Calendly — Invitee Created
   - When a user books, Calendly provides invitee name, email, phone, event time, and event URI.

2) Action: Find/Create User (Airtable)
   - Use invitee email to find existing `Users` in Airtable or create a new one.

3) Action: Create Record (Airtable) — Bookings
   - Map fields:
     - User (link) -> found/created user
     - Appliance -> (you may pass this via Calendly custom questions or ask the user to select a service page)
     - ServiceType -> e.g., "On-site service"
     - ScheduledAt -> event start time
     - BookingStatus -> "Scheduled"
     - PaymentStatus -> "Pending"

   - Save the newly created Booking record ID (Airtable record ID). Use it to notify and for later Razorpay notes.bookingId.

4) Action: Twilio — Send SMS to Technician
   - Use your technician phone number (can be static or looked up from Airtable) and send a message:
     "New booking: {ServiceType} for {UserName} on {ScheduledAt}. Contact: {UserPhone}. Booking ID: {AirtableRecordID}"

5) Action: Twilio — Send SMS to User (optional)
   - "Your service is scheduled for {ScheduledAt}. Technician will contact you. Booking ref: {AirtableRecordID}."

Notes on including Booking ID in Razorpay
- If the user immediately pays (via Razorpay), when creating the Razorpay order on the server, set `notes.bookingId = '<AirtableRecordID>'`. That way the webhook/confirm endpoints can update the correct Airtable Booking record.

Prefill calendar with appliance context
- Use Calendly custom questions to collect 'Appliance Type' or 'Appliance ID' so that Zapier can pass this into the Booking record in Airtable.

Security and reliability
- Use Zapier's error handling and retries for transient failures.
- Validate phone numbers before sending SMS. Keep Twilio credentials secret and use Zapier's Twilio integration rather than exposing Twilio keys client-side.

Testing tips
- Create a test event in Calendly and use Zapier's task history to inspect the payloads.
- Test Twilio SMS template with a controlled phone number first.

