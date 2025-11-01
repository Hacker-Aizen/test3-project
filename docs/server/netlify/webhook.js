const crypto = require('crypto');
const fetch = require('node-fetch');

exports.handler = async function(event, context){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  const payload = event.body || '';
  const signature = (event.headers && (event.headers['x-razorpay-signature'] || event.headers['X-Razorpay-Signature'])) || '';
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (expected !== signature) return { statusCode:400, body:'Invalid signature' };

  try{
    const body = JSON.parse(payload);
    const evt = body.event;
    if (evt === 'payment.captured' || evt === 'order.paid'){
      const entity = (body.payload && (body.payload.payment && body.payload.payment.entity)) || (body.payload && body.payload.order && body.payload.order.entity) || {};
      const notes = entity.notes || {};
      const bookingId = notes.bookingId || entity.receipt || null;
      const razorpayPaymentId = entity.id || null;
      if (bookingId && bookingId.startsWith('rec')){
        const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
        const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
        const AIRTABLE_BOOKINGS_TABLE = process.env.AIRTABLE_BOOKINGS_TABLE || 'Bookings';
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_BOOKINGS_TABLE)}/${bookingId}`;
        await fetch(url, { method:'PATCH', headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify({fields:{PaymentStatus:'Paid', BookingStatus:'Confirmed', RazorpayPaymentID: razorpayPaymentId}}) });
      }
    }
    return { statusCode:200, body: JSON.stringify({ok:true}) };
  }catch(err){ console.error(err); return { statusCode:500, body: JSON.stringify({error:err.message}) }; }
};