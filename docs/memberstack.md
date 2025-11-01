# Memberstack Integration & Auth — Bolt Nexus

Goal
- Use Memberstack to handle user signup/login and protect the dashboard. On signup/login, link the Memberstack member to an Airtable `Users` record (store MemberstackID in Airtable.MemberstackID).

High-level steps
1. Create a Memberstack site and members area
   - Sign up at Memberstack and create a Project for Bolt Nexus.
   - Configure your site domain (or local dev URL for testing).

2. Add Memberstack script to your site
   - Include the script in `index.html` (already present in prototype):
     <script src="https://api.memberstack.io/static/memberstack.js?custom" defer></script>

3. Protect dashboard and show/hide elements
   - Use Memberstack data attributes to show/hide sections:
     - `data-ms-member="logged-in"` — visible to logged-in members
     - `data-ms-member="logged-out"` — visible to logged-out visitors
   - Example: the `#dashboard` section in the prototype is wrapped with `data-ms-member="logged-in"`.

4. Map Memberstack member to Airtable (server-side webhook)
   - Configure Memberstack to send a webhook on member creation or update. Set the webhook URL to your server endpoint:
     `https://<your-server>/api/memberstack/webhook`
   - The server endpoint `server/index.js` already includes `POST /api/memberstack/webhook` which tries to find the user by email in Airtable and updates the `MemberstackID` field, or creates the user if not found.

5. Client-side immediate sync (optional)
   - The frontend prototype uses `MemberStack.onReady.then(...)` to detect a logged-in member and POST to `/api/airtable/find-or-create-user` to ensure the User record exists. This gives immediate dashboard access for new members.

Security & best practices
- Always use a server-side webhook to securely link Memberstack ID to your database; do not rely solely on client-side requests as they can be forged.
- Validate the Memberstack webhook (Memberstack supports a secret or signed payload); implement verification on the server if available.

Memberstack fields mapping (recommended)
- On Memberstack profile fields, include: Name, Email, Phone, City (optional). When a member signs up, these fields will be present in the webhook and used to populate Airtable.

Example client snippet (already in `app.js`)
- On Memberstack ready, the app calls `/api/airtable/find-or-create-user` with {name,email,phone,memberstackId}.

Next steps
- Configure Memberstack webhooks to point to `POST /api/memberstack/webhook` on your server or serverless function.
- In Memberstack dashboard, optionally add a redirect after signup to the diagnostics result page.
- If you want, I can create a Memberstack-protected demo flow with a mocked signup in the prototype and a short video walkthrough of the Memberstack dashboard setup.
