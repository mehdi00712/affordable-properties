// js/admin.js (diagnostic)
import { requireAuth, db, currencyFmt, SUPER_ADMIN_UID } from './app.js';
import {
  collection, query, where, getDocs, limit,
  doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    console.error('[admin:init] fatal', err);
    mountDebug().innerHTML = `
      <div class="alert error">Admin failed to start: ${err.message}</div>
    `;
  });
});

async function init(){
  const user = await requireAuth();

  // Debug panel
  const dbg = mountDebug();
  dbg.innerHTML = `
    <div class="panel" style="margin:12px 0;padding:12px;border:1px solid #eee;border-radius:10px">
      <div><strong>Admin debug</strong></div>
      <div>Signed in as: <code>${user.email || '(no email)'}</code></div>
      <div>UID: <code>${user.uid}</code></div>
      <div>Super admin UID expected: <code>${SUPER_ADMIN_UID}</code></div>
      <div id="dbg-rules" class="muted">Rules check: …</div>
      <div id="dbg-count" class="muted">Listings in DB: …</div>
      <div id="dbg-pending" class="muted">Pending query: …</div>
      <div id="dbg-approved" class="muted">Approved query: …</div>
    </div>
  `;

  if (user.uid !== SUPER_ADMIN_UID){
    document.getElementById('dbg-rules').innerHTML =
      `<span class="alert error">You are NOT the super admin. You won't see pending listings.</span>`;
    alert('Admins only'); window.location.href = './'; return;
  } else {
    document.getElementById('dbg-rules').textContent = 'Rules check: OK (UID matches super admin)';
  }

  // 1) Can we read ANYTHING from /listings? (rules sanity)
  try {
    const snapAll = await getDocs(query(collection(db, 'listings'), limit(5)));
    document.getElementById('dbg-count').textContent =
      `Listings in DB (first 5 read OK): ${snapAll.size}`;
    console.log('[admin] sample docs', snapAll.docs.map(d => ({ id: d.id, ...d.data() })));
    if (snapAll.size === 0) {
      // No data at all: tell user to create one
      const pendingDiv = document.getElementById('pending');
      pendingDiv.innerHTML = '<p class="muted">No listings exist yet. Submit one from the dashboard and it will appear here as pending.</p>';
    }
  } catch (err) {
    console.error('[admin] plain collection read failed', err);
    document.getElementById('dbg-count').innerHTML =
      `<span class="alert error">Cannot read /listings at all: ${err.code || err.message}. This means Firestore rules are blocking reads.</span>`;
    return; // no point continuing — queries will also fail
  }

  // 2) Load Pending + Approved
  await renderBuckets();
}

function mountDebug(){
  let box = document.getElementById('admin-debug');
  if (!box) {
    box = document.createElement('div');
    box.id = 'admin-debug';
    const main = document.querySelector('main .wrap') || document.querySelector('main') || document.body;
    main.insertBefore(box, main.firstChild);
  }
  return box;
}

function makeCardElement(){
  const tpl = document.getElementById('adminCardTpl');
  if (tpl && tpl.content && tpl.content.firstElementChild){
    return tpl.content.firstElementChild.cloneNode(true);
  }
  // Fallback simple card if template is missing
  const wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.innerHTML = `
    <div class="card-img"></div>
    <div class="card-body">
      <h3 class="card-title"></h3>
      <p class="card-meta"></p>
      <p class="card-price"></p>
      <div class="actions">
        <button class="btn small approve" type="button">Approve</button>
        <button class="btn outline small reject" type="button">Reject</button>
        <button class="btn danger small remove" type="button">Remove</button>
      </div>
    </div>`;
  return wrap;
}

function toCard(l){
  const el = makeCardElement();
  const img   = el.querySelector('.card-img');
  const title = el.querySelector('.card-title');
  const meta  = el.querySelector('.card-meta');
  const price = el.querySelector('.card-price');
  const btnApprove = el.querySelector('.approve');
  const btnReject  = el.querySelector('.reject');
  const btnRemove  = el.querySelector('.remove');

  if (img)   img.style.backgroundImage = `url('${(l.images && l.images[0]) || ''}')`;
  if (title) title.textContent = l.title || '(untitled)';
  if (meta)  meta.textContent  = `${l.propertyType||'-'} • ${l.city||'-'}, ${l.country||'-'} • Owner: ${(l.ownerUid||'').slice(0,6)}…`;
  if (price) price.textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / mo':'');

  btnApprove && (btnApprove.onclick = ()=> setStatus(l.id,'approved'));
  btnReject  && (btnReject .onclick = ()=> setStatus(l.id,'rejected'));
  btnRemove  && (btnRemove .onclick = ()=> removeListing(l.id));

  return el;
}

async function renderBuckets(){
  const pendingDiv  = document.getElementById('pending');
  const approvedDiv = document.getElementById('approved');

  // PENDING
  pendingDiv.innerHTML = '';
  try {
    const qPending = query(collection(db,'listings'), where('status','==','pending'));
    const snap = await getDocs(qPending);
    const items = snap.docs.map(d=>({id:d.id, ...d.data()}))
      .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    document.getElementById('dbg-pending').textContent = `Pending query OK (found ${items.length})`;
    if (!items.length) pendingDiv.innerHTML = '<p class="muted">No pending items.</p>';
    else items.forEach(l => pendingDiv.appendChild(toCard(l)));
  } catch (err) {
    console.error('[admin] pending query failed', err);
    document.getElementById('dbg-pending').innerHTML =
      `<span class="alert error">Pending query failed: ${err.code || err.message}</span>`;
    pendingDiv.innerHTML = '<p class="muted">Cannot load pending.</p>';
  }

  // APPROVED
  approvedDiv.innerHTML = '';
  try {
    const qApproved = query(collection(db,'listings'), where('status','==','approved'));
    const snap = await getDocs(qApproved);
    const items = snap.docs.map(d=>({id:d.id, ...d.data()}))
      .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    document.getElementById('dbg-approved').textContent = `Approved query OK (found ${items.length})`;
    if (!items.length) approvedDiv.innerHTML = '<p class="muted">No approved items.</p>';
    else items.forEach(l => approvedDiv.appendChild(toCard(l)));
  } catch (err) {
    console.error('[admin] approved query failed', err);
    document.getElementById('dbg-approved').innerHTML =
      `<span class="alert error">Approved query failed: ${err.code || err.message}</span>`;
    approvedDiv.innerHTML = '<p class="muted">Cannot load approved.</p>';
  }
}

async function setStatus(id,status){
  if (!confirm(`Set status to ${status}?`)) return;
  await updateDoc(doc(db,'listings',id), { status, updatedAt: serverTimestamp() });
  await renderBuckets();
}
async function removeListing(id){
  if (!confirm('Remove permanently?')) return;
  await deleteDoc(doc(db,'listings',id));
  await renderBuckets();
}
