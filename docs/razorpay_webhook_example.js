/*
  Example Express.js webhook to verify Razorpay signature and update Airtable booking record.
  - Install: npm i express body-parser crypto node-fetch
  - Set env: RAZORPAY_SECRET, AIRTABLE_API_KEY, AIRTABLE_BASE_ID
*/
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
app.use(bodyParser.json({type: '*/*'}));

const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

app.post('/razorpay/webhook', (req, res) => {
  const payload = JSON.stringify(req.body);
  const signature = req.headers['x-razorpay-signature'];

  const expected = crypto.createHmac('sha256', RAZORPAY_SECRET).update(payload).digest('hex');
  if (expected !== signature) {
    console.error('Invalid signature');
    return res.status(400).send('Invalid signature');
  }

  // Process payment
  const evt = req.body.event;
  if (evt === 'payment.captured' || evt === 'order.paid'){
    const payment = req.body.payload.payment.entity || req.body.payload.order.entity;
    const razorpayPaymentId = payment && payment.id;
    const notes = payment && payment.notes; // If you set an Airtable booking id in notes
    const bookingId = notes && notes.bookingId;

    // Update Airtable Booking record (requires bookingId mapping)
    if (bookingId){
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Bookings/${bookingId}`;
      fetch(url,{
        method:'PATCH',
        headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'},
        body: JSON.stringify({fields:{PaymentStatus:'Paid', BookingStatus:'Confirmed', RazorpayPaymentID: razorpayPaymentId}})
      }).then(r=>r.json()).then(j=>{
        console.log('Airtable updated', j);
      }).catch(err=>console.error(err));
    }
  }

  res.json({ok:true});
});

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log('Webhook server listening on',port));
