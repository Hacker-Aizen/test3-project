# Technician Dashboard (Airtable) — Bolt Nexus

Goal
- Provide technicians with a filtered Airtable Interface showing assigned jobs, contact details, scheduled times, and a simple workflow to mark jobs done and add after-service notes.

Airtable Setup
1. Use the existing `Bookings` table with fields: User (link), Appliance (link), ServiceType, ScheduledAt (date/time), Technician (single line or linked table), BookingStatus, PaymentStatus, RazorpayPaymentID, AfterServiceNotes.

2. Create a `Technicians` table (optional) with fields: Name, Phone, Email, AssignedAreas, AirtableUserID.

3. Populate technician names and contact details so you can link bookings to technicians.

Airtable Interface (for technicians)
1. Create a new Interface page (Airtable Interfaces) and select the `Bookings` table as the source.
2. Add a "Grid" or "List" element showing columns: Booking ID, User (name & phone), Appliance, ScheduledAt, BookingStatus, PaymentStatus.
3. Add a filter control: `Technician` is `current technician` (or use a view per technician). If you want per-tech login, create separate interface pages and share a specific interface link with each technician.
4. Add an expanded record view panel where the technician can:
   - See full user contact (link to Users table)
   - Click a "Mark Done" button (see Automations below)
   - Add AfterServiceNotes (long text)

Automations (Airtable)
- Automation 1: When Booking record's BookingStatus changes to "Done" -> Send email to user: "Service complete — confirm satisfaction." -> Optionally create a follow-up task to verify savings.
- Automation 2: When BookingStatus changes to "Done" and AfterServiceNotes added -> update `Appliances` record HealthScore or add an 'After Service Verified' flag (optional manual step for admin).

Marking Done UX
- Use a single-select field `BookingStatus` with statuses: Scheduled, Confirmed, In Progress, Done, Cancelled.
- Add a button or quick-edit visible in the Interface to set `BookingStatus = Done` and to add `AfterServiceNotes`.

Mobile / Offline tech support
- Airtable Interface is mobile-friendly. If technicians often operate offline, consider a dedicated mobile app or use Airtable's mobile app with the Interface screen pinned.

Security
- Control access via Airtable workspace permissions. Share Interface links only with authenticated technicians.
- Alternatively, build a very small technician portal that uses Airtable API key scoped to a technician service account (be careful with exposing keys).

Reporting & admin
- Create a view for admin that shows unpaid bookings (PaymentStatus != Paid) and another showing recent completed jobs.
- Add summary blocks for monthly savings verified and technician productivity.

