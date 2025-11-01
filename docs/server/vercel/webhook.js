const crypto = require('crypto');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const payload = JSON.stringify(req.body);
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  if (expected !== signature) return res.status(400).send('Invalid signature');

  try{
    const evt = req.body.event;
    if (evt === 'payment.captured' || evt === 'order.paid'){
      const entity = (req.body.payload && (req.body.payload.payment && req.body.payload.payment.entity)) || (req.body.payload && req.body.payload.order && req.body.payload.order.entity) || {};
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
    res.json({ok:true});
  }catch(err){ console.error(err); res.status(500).json({error:err.message}); }
};