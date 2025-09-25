import { requireAuth, currencyFmt } from './app.js';

const pendingDiv = document.getElementById('pending');
const approvedDiv = document.getElementById('approved');
const tpl = document.getElementById('adminCardTpl');

let currentUser;

async function requireAdmin() {
  currentUser = await requireAuth();
  const roleDoc = await firebase.firestore().collection('roles').doc(currentUser.uid).get();
  if (!roleDoc.exists || roleDoc.data().role !== 'admin') {
    alert('Admins only'); location.href = './'; return;
  }
}

async function load() {
  await requireAdmin();
  const db = firebase.firestore();

  // Pending
  {
    pendingDiv.innerHTML = '';
    const snap = await db.collection('listings').where('status','==','pending').orderBy('createdAt','desc').get();
    for (const d of snap.docs) { pendingDiv.appendChild(makeCard(d)); }
    if (snap.empty) pendingDiv.innerHTML = '<p>No pending items.</p>';
  }
  // Approved
  {
    approvedDiv.innerHTML = '';
    const snap = await db.collection('listings').where('status','==','approved').orderBy('createdAt','desc').limit(50).get();
    for (const d of snap.docs) { approvedDiv.appendChild(makeCard(d)); }
    if (snap.empty) approvedDiv.innerHTML = '<p>No approved items.</p>';
  }
}

function makeCard(doc) {
  const l = {id:doc.id, ...doc.data()};
  const el = tpl.content.firstElementChild.cloneNode(true);
  el.querySelector('.card-img').style.backgroundImage = `url('${l.images?.[0] || ''}')`;
  el.querySelector('.card-title').textContent = l.title;
  el.querySelector('.card-meta').textContent = `${l.propertyType} • ${l.city}, ${l.country} • Owner: ${l.ownerUid.slice(0,6)}…`;
  el.querySelector('.card-price').textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / mo':'');

  el.querySelector('.approve').onclick = ()=> setStatus(l.id,'approved');
  el.querySelector('.reject').onclick = ()=> setStatus(l.id,'rejected');
  el.querySelector('.remove').onclick = ()=> removeListing(l.id);

  return el;
}

async function setStatus(id, status) {
  if (!confirm(`Set status to ${status}?`)) return;
  await firebase.firestore().collection('listings').doc(id).update({
    status, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  load();
}
async function removeListing(id) {
  if (!confirm('Remove permanently?')) return;
  await firebase.firestore().collection('listings').doc(id).delete();
  load();
}

load();
