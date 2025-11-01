require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');
const crypto = require('crypto');
const Razorpay = require('razorpay');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';
const AIRTABLE_BOOKINGS_TABLE = process.env.AIRTABLE_BOOKINGS_TABLE || 'Bookings';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET){
  console.warn('Missing one or more required environment variables. See .env.example');
}

const airtableBaseUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });

// Health
app.get('/api/health', (req,res)=>{ res.json({ok:true, time: new Date().toISOString()}); });

// Find or create a user in Airtable by email (POST)
app.post('/api/airtable/find-or-create-user', async (req,res) => {
  try{
    const {name, email, phone, city, memberstackId} = req.body;
    if (!email) return res.status(400).json({error:'email required'});

    const filter = `?filterByFormula=${encodeURIComponent(`{Email}='${email.replace("'","\\'")}'`)}&maxRecords=1`;
    const url = `${airtableBaseUrl}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}${filter}`;
    const r = await fetch(url, {headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`}});
    const parsed = await r.json();
    if (parsed.records && parsed.records.length){
      const record = parsed.records[0];
      return res.json({existing:true, record});
    }

    // create
    const createUrl = `${airtableBaseUrl}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
    const body = {fields: { Name: name||'', Email: email, Phone: phone||'', City: city||'', MemberstackID: memberstackId||'' }};
    const createRes = await fetch(createUrl, {method:'POST', headers: {'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify(body)});
    const created = await createRes.json();
    return res.json({created:true, record:created});
  }catch(err){
    console.error(err); return res.status(500).json({error:err.message});
  }
});

// Create Razorpay order (server-side) — client should call this before opening Checkout
app.post('/api/razorpay/create-order', async (req,res)=>{
  try{
    const {amount, currency='INR', receipt, notes} = req.body;
    if (!amount) return res.status(400).json({error:'amount required in paise'});

    const options = { amount: +amount, currency, receipt: receipt || `rcpt_${Date.now()}`, payment_capture: 1, notes: notes||{} };
    const order = await razorpay.orders.create(options);
    return res.json({ok:true, order, key_id: RAZORPAY_KEY_ID});
  }catch(err){
    console.error('razorpay create error', err); return res.status(500).json({error:err.message});
  }
});

// Razorpay webhook verification endpoint
app.post('/api/razorpay/webhook', async (req,res)=>{
  const payload = JSON.stringify(req.body);
  const signature = req.headers['x-razorpay-signature'];
  const secret = RAZORPAY_KEY_SECRET;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (expected !== signature){
    console.error('Invalid razorpay signature');
    return res.status(400).send('Invalid signature');
  }

  try{
    const evt = req.body.event;
    if (evt === 'payment.captured' || evt === 'order.paid'){
      const payment = (req.body.payload && (req.body.payload.payment || req.body.payload.order)) || {};
      // Try to extract bookingId from notes or receipt
      const entity = (req.body.payload && (req.body.payload.payment && req.body.payload.payment.entity)) || (req.body.payload.order && req.body.payload.order.entity) || {};
      const notes = entity.notes || {};
      const bookingId = notes.bookingId || entity.receipt || null;
      const razorpayPaymentId = entity.id || (entity.payment_id) || null;

      if (bookingId){
        // If bookingId looks like an Airtable record id (rec...), update that record
        const bookingRecordId = bookingId.startsWith('rec') ? bookingId : null;
        if (bookingRecordId){
          const url = `${airtableBaseUrl}/${encodeURIComponent(AIRTABLE_BOOKINGS_TABLE)}/${bookingRecordId}`;
          const body = { fields: { PaymentStatus: 'Paid', BookingStatus: 'Confirmed', RazorpayPaymentID: razorpayPaymentId }};
          await fetch(url, { method:'PATCH', headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify(body) });
          console.log('Airtable booking updated for', bookingRecordId);
        } else {
          console.log('Received webhook for bookingId that is not an Airtable record id:', bookingId);
        }
      } else {
        console.log('No bookingId found in notes/receipt. Payment id:', razorpayPaymentId);
      }
    }
    res.json({ok:true});
  }catch(err){ console.error(err); res.status(500).json({error:err.message}); }
});

// Client-side payment confirmation: verifies signature and reconciles immediately.
app.post('/api/razorpay/confirm', async (req,res)=>{
  try{
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) return res.status(400).json({error:'missing payment fields'});

    // verify signature: HMAC_SHA256(order_id|payment_id, secret)
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature){
      console.error('Razorpay signature mismatch (confirm)');
      return res.status(400).json({error:'invalid signature'});
    }

    // fetch order to check for booking id in notes or receipt
    let bookingId = null;
    try{
      const order = await razorpay.orders.fetch(razorpay_order_id);
      const notes = order.notes || {};
      bookingId = notes.bookingId || order.receipt || null;
    }catch(err){
      // non-fatal: continue without bookingId
      console.warn('Could not fetch order details from Razorpay:', err && err.message);
    }

    if (bookingId && bookingId.startsWith('rec')){
      const url = `${airtableBaseUrl}/${encodeURIComponent(AIRTABLE_BOOKINGS_TABLE)}/${bookingId}`;
      const body = { fields: { PaymentStatus: 'Paid', BookingStatus: 'Confirmed', RazorpayPaymentID: razorpay_payment_id }};
      await fetch(url, { method:'PATCH', headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify(body) });
      console.log('Airtable booking updated via confirm for', bookingId);
    }

    return res.json({ok:true, bookingId});
  }catch(err){ console.error(err); return res.status(500).json({error:err.message}); }
});

// Memberstack webhook: called when a new member signs up or updates profile
// Memberstack can call a webhook with member data; map Memberstack ID to Airtable Users
app.post('/api/memberstack/webhook', async (req,res)=>{
  try{
    const body = req.body || {};
    // Example Memberstack payload may contain: { member: { id, name, email, phone } }
    const member = body.member || body;
    const msId = member.id || member.member_id || null;
    const email = (member.email || member.email_address || '').toString();
    const name = member.name || member.full_name || '';
    const phone = member.phone || '';
    if (!msId || !email) return res.status(400).json({error:'member id and email required'});

    // Try to find user by email
    const filter = `?filterByFormula=${encodeURIComponent(`{Email}='${email.replace("'","\\'")}'`)}&maxRecords=1`;
    const url = `${airtableBaseUrl}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}${filter}`;
    const r = await fetch(url, {headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`}});
    const parsed = await r.json();
    if (parsed.records && parsed.records.length){
      const rec = parsed.records[0];
      // update MemberstackID if missing
      const recId = rec.id;
      const patchUrl = `${airtableBaseUrl}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}/${recId}`;
      await fetch(patchUrl, {method:'PATCH', headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify({fields:{MemberstackID: msId}})});
      return res.json({ok:true, updated:recId});
    }

    // create new user record
    const createUrl = `${airtableBaseUrl}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
    const createBody = { fields: { Name: name, Email: email, Phone: phone, MemberstackID: msId } };
    const createRes = await fetch(createUrl, {method:'POST', headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify(createBody)});
    const created = await createRes.json();
    return res.json({ok:true, created});
  }catch(err){ console.error(err); return res.status(500).json({error:err.message}); }
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log(`Bolt Nexus server listening on ${port}`));
