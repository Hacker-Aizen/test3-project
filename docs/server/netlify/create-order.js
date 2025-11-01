const Razorpay = require('razorpay');
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try{
    const body = JSON.parse(event.body || '{}');
    const { amount, currency='INR', receipt, notes } = body;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return { statusCode:500, body: JSON.stringify({error:'Razorpay keys not configured'}) };
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({ amount: +amount, currency, receipt: receipt || `rcpt_${Date.now()}`, payment_capture: 1, notes: notes||{} });
    return { statusCode:200, body: JSON.stringify({ ok:true, order, key_id: keyId }) };
  }catch(err){ console.error(err); return { statusCode:500, body: JSON.stringify({ error: err.message }) }; }
};