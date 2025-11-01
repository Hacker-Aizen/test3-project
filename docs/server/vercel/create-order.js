const fetch = require('node-fetch');
const Razorpay = require('razorpay');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try{
    const { amount, currency='INR', receipt, notes } = req.body;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return res.status(500).json({error:'Razorpay keys not configured'});
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({ amount: +amount, currency, receipt: receipt || `rcpt_${Date.now()}`, payment_capture: 1, notes: notes||{} });
    res.json({ ok:true, order, key_id: keyId });
  }catch(err){ console.error(err); res.status(500).json({error:err.message}); }
};