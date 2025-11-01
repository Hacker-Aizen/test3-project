const fetch = require('node-fetch');

exports.handler = async function(event, context){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  try{
    const body = JSON.parse(event.body || '{}');
    const { name, email, phone, city, memberstackId } = body;
    if (!email) return { statusCode:400, body: JSON.stringify({error:'email required'}) };
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_USERS_TABLE = process.env.AIRTABLE_USERS_TABLE || 'Users';
    const filter = `?filterByFormula=${encodeURIComponent(`{Email}='${email.replace("'","\\'")}'`)}&maxRecords=1`;
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}${filter}`;
    const r = await fetch(url, {headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`}});
    const parsed = await r.json();
    if (parsed.records && parsed.records.length){
      return { statusCode:200, body: JSON.stringify({existing:true, record: parsed.records[0]}) };
    }
    const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_USERS_TABLE)}`;
    const bodyCreate = { fields: { Name: name||'', Email: email, Phone: phone||'', City: city||'', MemberstackID: memberstackId||'' }};
    const createRes = await fetch(createUrl, {method:'POST', headers:{'Authorization':`Bearer ${AIRTABLE_API_KEY}`,'Content-Type':'application/json'}, body: JSON.stringify(bodyCreate)});
    const created = await createRes.json();
    return { statusCode:200, body: JSON.stringify({created:true, record:created}) };
  }catch(err){ console.error(err); return { statusCode:500, body: JSON.stringify({error:err.message}) }; }
};