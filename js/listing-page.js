import { currencyFmt } from './app.js';

const params = new URLSearchParams(location.search);
const id = params.get('id');
const gallery = document.getElementById('gallery');

async function load() {
  if (!id) { location.href = './'; return; }
  const db = firebase.firestore();
  const snap = await db.collection('listings').doc(id).get();
  if (!snap.exists || (snap.data().status !== 'approved' && !(firebase.auth().currentUser))) {
    document.body.innerHTML = '<p style="padding:20px">Listing not available.</p>'; return;
  }
  const l = snap.data();

  // Fill
  document.getElementById('title').textContent = l.title;
  document.getElementById('meta').textContent = `${l.propertyType} • ${l.city}, ${l.country} • ${l.bedrooms||0} bed • ${l.bathrooms||0} bath • ${l.sizeSqm||'-'} sqm`;
  document.getElementById('price').textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / month':'');
  document.getElementById('desc').textContent = l.description;
  document.getElementById('contact').textContent = `${l.ownerContact?.name || ''} • ${l.ownerContact?.phone || ''} • ${l.ownerContact?.email || ''}`;

  (l.images || []).forEach(url => {
    const img = document.createElement('img'); img.src = url; gallery.appendChild(img);
  });

  document.getElementById('btn-report').onclick = async ()=>{
    const reason = prompt('Why are you reporting this listing?');
    if (!reason) return;
    await db.collection('reports').add({
      listingId: id, reason, reportedBy: firebase.auth().currentUser?.uid || 'anon', createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert('Thanks for your report. Our admins will review it.');
  };
}

load();
