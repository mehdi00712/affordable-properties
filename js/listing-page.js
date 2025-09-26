import { auth, db, currencyFmt } from './app.js';
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const id = new URLSearchParams(location.search).get('id');
const gallery = document.getElementById('gallery');

async function load() {
  if (!id) { location.href='./'; return; }
  const snap = await getDoc(doc(db,'listings',id));
  if (!snap.exists()) { document.body.innerHTML = '<p style="padding:20px">Listing not available.</p>'; return; }
  const l = snap.data();

  if (l.status !== 'approved') {
    let allowed = false;
    await new Promise(r => onAuthStateChanged(auth, u=>{ allowed = !!u; r(); }));
    if (!allowed) { document.body.innerHTML = '<p style="padding:20px">Listing not available.</p>'; return; }
  }

  document.getElementById('title').textContent = l.title;
  document.getElementById('meta').textContent = `${l.propertyType} • ${l.city}, ${l.country} • ${l.bedrooms||0} bed • ${l.bathrooms||0} bath • ${l.sizeSqm||'-'} sqm`;
  document.getElementById('price').textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / month':'');
  document.getElementById('desc').textContent = l.description;
  document.getElementById('contact').textContent = `${l.ownerContact?.name || ''} • ${l.ownerContact?.phone || ''} • ${l.ownerContact?.email || ''}`;

  (l.images||[]).forEach(u=>{ const img=document.createElement('img'); img.src=u; gallery.appendChild(img); });

  document.getElementById('btn-report').onclick = async ()=>{
    let uid='anon';
    await new Promise(r=>onAuthStateChanged(auth,u=>{ if(u) uid=u.uid; r(); }));
    const reason = prompt('Why are you reporting this listing?');
    if (!reason) return;
    await addDoc(collection(db,'reports'), { listingId:id, reason, reportedBy:uid, createdAt: serverTimestamp() });
    alert('Thanks for your report. Our admins will review it.');
  };
}
load();
