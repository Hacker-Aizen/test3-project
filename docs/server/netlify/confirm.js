const crypto = require('crypto');
const Razorpay = require('razorpay');
const fetch = require('node-fetch');

exports.handler = async function(event, context){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  try{
    const body = JSON.parse(event.body || '{}');
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) return { statusCode:400, body: JSON.stringify({error:'missing payment fields'}) };

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const expected = crypto.createHmac('sha256', keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expected !== razorpay_signature) return { statusCode:400, body: JSON.stringify({error:'invalid signature'}) };

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    let bookingId = null;
    try{
      const order = await razorpay.orders.fetch(razorpay_order_id);
      const notes = order.notes || {};
      bookingId = notes.bookingId || order.receipt || null;
    }catch(err){ console.warn('Could not fetch order from Razorpay', err && err.message); }

    if (bookingId && bookingId.startsWith('rec')){
      const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
      const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
      const AIRTABLE_BOOKINGS_TABLE = process.env.AIRTABLE_BOOKINGS_TABLE || 'Bookings';
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_BOOKINGS_TABLE)}/${bookingId}`;
      await fetch(url, { method:'PATCH', headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify({fields:{PaymentStatus:'Paid', BookingStatus:'Confirmed', RazorpayPaymentID: razorpay_payment_id}}) });
    }

    return { statusCode:200, body: JSON.stringify({ok:true, bookingId}) };
  }catch(err){ console.error(err); return { statusCode:500, body: JSON.stringify({error:err.message}) }; }
};