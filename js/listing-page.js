import { auth, db, currencyFmt } from './app.js';
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const params = new URLSearchParams(location.search);
const id = params.get('id');
const gallery = document.getElementById('gallery');

async function load() {
  if (!id) { location.href = './'; return; }
  const ref = doc(db, 'listings', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) { document.body.innerHTML = '<p style="padding:20px">Listing not available.</p>'; return; }
  const l = snap.data();

  // If not approved, show only to signed-in owner/admin (basic client guard; rules enforce server side)
  if (l.status !== 'approved') {
    let allowed = false;
    await new Promise(res => onAuthStateChanged(auth, (u)=>{ allowed = !!u; res(); }));
    if (!allowed) { document.body.innerHTML = '<p style="padding:20px">Listing not available.</p>'; return; }
  }

  document.getElementById('title').textContent = l.title;
  document.getElementById('meta').textContent =
    `${l.propertyType} • ${l.city}, ${l.country} • ${l.bedrooms||0} bed • ${l.bathrooms||0} bath • ${l.sizeSqm||'-'} sqm`;
  document.getElementById('price').textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / month':'');
  document.getElementById('desc').textContent = l.description;
  document.getElementById('contact').textContent =
    `${l.ownerContact?.name || ''} • ${l.ownerContact?.phone || ''} • ${l.ownerContact?.email || ''}`;

  (l.images || []).forEach(url => {
    const img = document.createElement('img'); img.src = url; gallery.appendChild(img);
  });

  const reportBtn = document.getElementById('btn-report');
  reportBtn.onclick = async () => {
    let reporterUid = 'anon';
    await new Promise(res => onAuthStateChanged(auth, (u)=>{ if (u) reporterUid = u.uid; res(); }));
    const reason = prompt('Why are you reporting this listing?');
    if (!reason) return;
    await addDoc(collection(db, 'reports'), {
      listingId: id, reason, reportedBy: reporterUid, createdAt: serverTimestamp()
    });
    alert('Thanks for your report. Our admins will review it.');
  };
}
load();
