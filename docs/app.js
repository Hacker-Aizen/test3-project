/* Bolt Nexus - prototype front-end logic
   - Simulates Typeform flow locally for demo
   - Shows animated ₹ counter and circular health progress
   - Contains placeholders & examples for Airtable, Memberstack, Razorpay, Calendly integration points
*/

const diagBtn = document.getElementById('run-diagnostic');
const openDiag = document.getElementById('open-diagnostic');
const modal = document.getElementById('diag-modal');
const closeModal = document.getElementById('close-modal');
const diagForm = document.getElementById('diagnostic-form');
const resultsSection = document.getElementById('results');
const resultRupee = document.getElementById('result-rupee');
const healthScoreEl = document.getElementById('health-score');
const progressCircle = document.querySelector('.progress');
const heroSavings = document.getElementById('hero-savings');

// Intersection Observer for scroll-triggered animations
const observerOptions = { threshold: 0.1 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in-up');
    }
  });
}, observerOptions);

// Observe sections for animations
document.querySelectorAll('.plans, .dashboard').forEach(section => observer.observe(section));

// Animate hero savings on load
let heroVal = 1299;
heroSavings.innerText = heroVal.toLocaleString();
setInterval(() => {
  heroSavings.classList.add('pulse');
  setTimeout(() => heroSavings.classList.remove('pulse'), 2000);
}, 5000);

openDiag?.addEventListener('click', ()=>showModal());
diagBtn?.addEventListener('click', ()=>showModal());
closeModal?.addEventListener('click', ()=>hideModal());

function showModal(){ modal.setAttribute('aria-hidden','false'); }
function hideModal(){ modal.setAttribute('aria-hidden','true'); }

// Diagnostic calculation (client-side mimic of Google Sheets logic). In prod: Typeform -> Zapier -> Sheets compute -> Airtable -> send results back.
function computeDiagnostic({appliance, year, hours, months_since_service}){
  // assumptions & simple model:
  // base inefficiency per appliance (kWh/mo) * rate ₹8/kWh -> loss estimate
  const now = new Date();
  const age = year ? Math.max(0, now.getFullYear() - +year) : 2;
  const baseKwh = {ac:120, fridge:60, washer:30}[appliance] || 50; // monthly baseline
  const usageFactor = Math.min(3, Math.max(0.5, (hours||4)/4));
  const ageFactor = 1 + (age*0.05);
  const serviceFactor = 1 + ( (months_since_service||12) / 24 );
  const inefficiencyKwh = baseKwh * (ageFactor) * (usageFactor) * (serviceFactor);
  const rate = 8; // ₹ per kWh
  const rupeesLoss = Math.round((inefficiencyKwh - baseKwh) * rate); // extra loss vs baseline

  // health score 0-100: lower loss => higher score
  const score = Math.max(6, Math.min(100, Math.round(100 - (rupeesLoss/200)*100)));
  return {rupees: Math.max(50, rupeesLoss), score};
}

function animateNumber(el, from, to, duration=900){
  const start = performance.now();
  requestAnimationFrame(function frame(now){
    const t = Math.min(1, (now-start)/duration);
    const val = Math.round(from + (to-from)*t);
    el.innerText = val.toLocaleString();
    if(t<1) requestAnimationFrame(frame);
  });
}

function setProgress(score){
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const pct = score/100;
  const offset = circumference * (1 - pct);
  progressCircle.style.strokeDashoffset = offset;
  document.getElementById('health-score').innerText = score;
}

// on form submit: simulate Typeform submission -> Zapier -> Sheets -> Airtable -> show results
diagForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(diagForm);
  const data = {};
  fd.forEach((v,k)=>data[k]=v);

  // perform local compute (mimic Sheets result)
  const res = computeDiagnostic({appliance:data.appliance, year:data.year, hours:+data.hours, months_since_service:+data.months_since_service});

  // Show results section with animations
  resultsSection.style.display = 'block';
  animateNumber(resultRupee, 0, res.rupees, 1000);
  setProgress(res.score);

  // In actual flow: send payload to Zapier webhook (Typeform would do this). Example:
  // fetch('https://hooks.zapier.com/hooks/catch/XXX/YYY', {method:'POST', body:JSON.stringify({...data, rupees:res.rupees, score:res.score}), headers:{'Content-Type':'application/json'}})

  // Also create Airtable records via Zapier — instructions in zapier_workflows.md
  hideModal();
});

// Plans / Razorpay placeholder handlers
document.querySelectorAll('[data-service]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const svc = btn.getAttribute('data-service');
    // Map service to price
    const priceMap = {ac_one:799, ac_amc:999, fridge_one:699, fridge_amc:799, washer_one:649, washer_amc:749};
    const price = priceMap[svc] || 799;
    // Open Razorpay checkout (replace key with your test key)
    openRazorpayCheckout({amount:price*100, currency:'INR', name:'Bolt Nexus', description:svc});
  });
});

function openRazorpayCheckout({amount,currency,name,description}){
  // Call server to create an order and open Razorpay Checkout (secure flow)
  fetch('/api/razorpay/create-order', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ amount: amount, currency, receipt: `rcpt_${Date.now()}`, notes: {service: description} })
  }).then(r=>r.json()).then(payload=>{
    if (!payload || !payload.ok){
      alert('Failed to create payment order.');
      console.error(payload);
      return;
    }
    const order = payload.order;
    const key_id = payload.key_id;
    const options = {
      key: key_id,
      amount: order.amount,
      currency: order.currency,
      name: name || 'Bolt Nexus',
      description: description,
      order_id: order.id,
      handler: function (response){
        // response contains razorpay_payment_id, razorpay_order_id, razorpay_signature
        // UX: show confirmation and instruct server to reconcile (server webhook will also update Airtable)
        alert('Payment successful. Thank you!');
        console.log('Razorpay success', response);
        // Optionally POST to your server to record the immediate success for UI
        fetch('/api/razorpay/confirm', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(response)}).catch(()=>{});
      },
      prefill: { name: '', email: '', contact: '' },
      notes: { service: description }
    };
    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (resp){
      alert('Payment failed: ' + (resp.error && resp.error.description));
      console.error('payment.failed', resp);
    });
    rzp.open();
  }).catch(err=>{ console.error(err); alert('Payment initialization failed'); });
}

// Calendly integration: open popup with prefilled data
function openCalendly(email, name, phone, service){
  // Ensure Calendly script loaded
  try{
    const base = 'https://calendly.com/YOUR_USERNAME/YOUR_EVENT';
    const url = new URL(base);
    if (email) url.searchParams.set('email', email);
    if (name) url.searchParams.set('name', name);
    if (phone) url.searchParams.set('a1', phone); // a1 is custom question field if configured
    if (service) url.searchParams.set('service', service);
    if (window.Calendly && Calendly.initPopupWidget){
      Calendly.initPopupWidget({ url: url.toString() });
    } else {
      // fallback: open in new tab
      window.open(url.toString(), '_blank');
    }
  }catch(err){ console.error('Calendly open error', err); }
}

// Attach schedule handlers to buttons marked data-action="schedule"
function wireSchedulingButtons(){
  document.querySelectorAll('[data-action="schedule"]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const svc = btn.getAttribute('data-service') || '';
      // try pull user info from Memberstack if available
      let email='', name='', phone='';
      if (window.MemberStack && MemberStack.onReady){
        MemberStack.onReady.then(member=>{
          if (member && member.loggedIn){
            email = member.email || '';
            name = member.name || '';
            phone = member.phone || '';
          }
          openCalendly(email, name, phone, svc);
        }).catch(()=>{ openCalendly('', '', '', svc); });
      } else {
        openCalendly('', '', '', svc);
      }
    });
  });
}

// Run wiring for scheduling buttons
document.addEventListener('DOMContentLoaded', ()=>{
  wireSchedulingButtons();
});

// Load appliances via Airtable API (demo) – placeholder: in prod, call serverless endpoint to hide API key
async function loadAppliances(){
  const container = document.getElementById('appliance-tiles');
  container.innerHTML = '';
  // Example fetch: require a server-side proxy or use Airtable's read-only API key for demo only
  // const rows = await fetch('/api/airtable/appliances').then(r=>r.json());
  const rows = [
    {id:1,appliance:'AC',model:'LG 1.5T',score:72,savings:420, status:'Needs service'},
    {id:2,appliance:'Fridge',model:'Whirlpool 200L',score:88,savings:120, status:'Good'}
  ];
  rows.forEach(r=>{
    const tile = document.createElement('div'); tile.className='tile';
    tile.innerHTML = `<div class="hdr"><div><strong>${r.appliance}</strong><div class="meta">${r.model}</div></div><div><button class='btn'>Schedule</button></div></div><div class='meta'>Health ${r.score} • ₹${r.savings}/mo</div>`;
    container.appendChild(tile);
  });
}

// Initialize demo
document.addEventListener('DOMContentLoaded', ()=>{
  // set initial dash progress offset
  const radius=68; const circumference=2*Math.PI*radius; progressCircle.style.strokeDasharray = `${circumference}`; progressCircle.style.strokeDashoffset = circumference;
  loadAppliances();
});

// Memberstack client integration: on login or ready, ensure Airtable user exists (via server proxy)
if (window.MemberStack){
  MemberStack.onReady.then(member => {
    try{
      if (member && member.loggedIn){
        const memberId = member.id || member['member-id'] || member['msid'];
        const email = member.email || member['email'];
        const name = member.name || member['name'] || '';
        const phone = member.phone || '';
        // Call server to find-or-create Airtable user (server proxy keeps keys safe)
        fetch('/api/airtable/find-or-create-user', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ name, email, phone, memberstackId: memberId })
        }).then(r=>r.json()).then(j=>{
          console.log('Memberstack linked to Airtable:', j);
          // Optionally refresh dashboard data
          loadAppliances();
        }).catch(err=>console.error(err));
      }
    }catch(err){ console.warn('MemberStack integration error', err); }
  }).catch(()=>{});
}

/* Integration notes embedded as comments:

- Airtable: Use serverless functions or a small backend to hold AIRTABLE_API_KEY; fetch via that proxy. Sample server call:
  GET /api/airtable/users?memberstackid=MS_123 -> returns user + appliances

- Memberstack: Protect the #dashboard route via Memberstack with `data-ms-member` attributes. On signup/login, Memberstack can call Zapier webhook to create or link Airtable user record (store MemberstackID in Airtable Users.MemberstackID).

- Typeform: Embed the Typeform for production. Typeform submits to Zapier webhook. Use Zap: Typeform -> Create row in Google Sheets -> wait 1 minute (Sheets calc) -> Zapier reads computed fields -> Create records in Airtable (Users, Appliances) -> Send email to user (SendGrid/Gmail) and redirect user to result page (frontend) via webhook.

- Razorpay: Create checkout link per service (server-side) or use Checkout overlay. Razorpay webhook should verify signature and update Airtable Booking record status=Paid.

- Calendly: Use embed script and prefill with user email/phone via query parameters. Use Zap when an event is scheduled to create Booking record in Airtable and notify via Twilio.

*/