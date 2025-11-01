const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try{
    const { name, email, phone, city, memberstackId } = req.body;
    if (!email) return res.status(400).json({error:'email required'});
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';
    const filter = `?filterByFormula=${encodeURIComponent(`{Email}='${email.replace("'","\\'")}'`)}&maxRecords=1`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}${filter}`;
    const r = await fetch(url, {headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`}});
    const parsed = await r.json();
    if (parsed.records && parsed.records.length){
      return res.json({existing:true, record: parsed.records[0]});
    }
    const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
    const body = { fields: { Name: name||'', Email: email, Phone: phone||'', City: city||'', MemberstackID: memberstackId||'' }};
    const createRes = await fetch(createUrl, {method:'POST', headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify(body)});
    const created = await createRes.json();
    return res.json({created:true, record:created});
  }catch(err){ console.error(err); res.status(500).json({error:err.message}); }
};