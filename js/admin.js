// js/admin.js (v4: start immediately if DOM is already ready)
import { requireAuth, db, currencyFmt, SUPER_ADMIN_UID } from './app.js';
import {
  collection, query, where, getDocs, limit,
  doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

console.log('[admin] script loaded');

function showDebug(html){
  let box = document.getElementById('admin-debug');
  if (!box) {
    box = document.createElement('div');
    box.id = 'admin-debug';
    box.className = 'panel';
    box.style.cssText = 'margin:12px 0 16px;padding:12px;border:1px solid #eee;border-radius:12px';
    const main = document.querySelector('main .wrap') || document.querySelector('main') || document.body;
    main.insertBefore(box, main.firstChild);
  }
  box.innerHTML = html;
  return box;
}
function setLine(id, text, cls=''){
  const box = document.getElementById('admin-debug') || showDebug('');
  let el = document.getElementById(id);
  if (!el){
    el = document.createElement('div');
    el.id = id;
    el.className = 'muted';
    box.appendChild(el);
  }
  el.className = cls || 'muted';
  el.innerHTML = text;
}

async function start(){
  console.log('[admin] start() called');
  const user = await requireAuth();

  showDebug(`
    <strong>Admin debug</strong>
    <div id="dbg-user"></div>
    <div id="dbg-uid"></div>
    <div id="dbg-admin"></div>
    <div id="dbg-count"></div>
    <div id="dbg-pending"></div>
    <div id="dbg-approved"></div>
  `);
  setLine('dbg-user', `Signed in as: <code>${user.email || '(no email)'}</code>`);
  setLine('dbg-uid',  `UID: <code>${user.uid}</code> (expected: <code>${SUPER_ADMIN_UID}</code>)`);

  if (user.uid !== SUPER_ADMIN_UID){
    setLine('dbg-admin', `<span class="alert error">You are NOT the super admin. Redirecting…</span>`, 'alert error');
    alert('Admins only');
    window.location.href = './';
    return;
  } else {
    setLine('dbg-admin', `<span class="alert success">Super admin verified.</span>`, 'alert success');
  }

  // sanity: can we read anything at all?
  try {
    const testSnap = await getDocs(query(collection(db,'listings'), limit(3)));
    setLine('dbg-count', `Plain read OK. First 3 docs: ${testSnap.size}`);
    console.log('[admin] sample docs', testSnap.docs.map(d=>({id:d.id, ...d.data()})));
  } catch (err) {
    console.error('[admin] plain read failed', err);
    setLine('dbg-count', `❌ Cannot read /listings: <code>${err.code || err.message}</code>`, 'alert error');
    return;
  }

  await loadBuckets();
}

function makeCardElement(){
  const tpl = document.getElementById('adminCardTpl');
  if (tpl && tpl.content && tpl.content.firstElementChild){
    return tpl.content.firstElementChild.cloneNode(true);
  }
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
  const bA = el.querySelector('.approve');
  const bR = el.querySelector('.reject');
  const bD = el.querySelector('.remove');

  if (img)   img.style.backgroundImage = `url('${(l.images && l.images[0]) || ''}')`;
  if (title) title.textContent = l.title || '(untitled)';
  if (meta)  meta.textContent  = `${l.propertyType||'-'} • ${l.city||'-'}, ${l.country||'-'} • Owner: ${(l.ownerUid||'').slice(0,6)}…`;
  if (price) price.textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / mo':'');

  bA && (bA.onclick = ()=> setStatus(l.id,'approved'));
  bR && (bR.onclick = ()=> setStatus(l.id,'rejected'));
  bD && (bD.onclick = ()=> removeListing(l.id));

  return el;
}

async function loadBuckets(){
  const pendingDiv  = document.getElementById('pending');
  const approvedDiv = document.getElementById('approved');
  pendingDiv.innerHTML = ''; approvedDiv.innerHTML = '';

  try {
    const qP = query(collection(db,'listings'), where('status','==','pending'));
    const sP = await getDocs(qP);
    const items = sP.docs.map(d=>({id:d.id, ...d.data()}))
      .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    setLine('dbg-pending', `Pending query OK: ${items.length} found`);
    if (!items.length) pendingDiv.innerHTML = '<p class="muted">No pending items.</p>';
    else items.forEach(l => pendingDiv.appendChild(toCard(l)));
  } catch (err) {
    console.error('[admin] pending failed', err);
    setLine('dbg-pending', `❌ Pending failed: <code>${err.code || err.message}</code>`, 'alert error');
    pendingDiv.innerHTML = '<p class="muted">Cannot load pending.</p>';
  }

  try {
    const qA = query(collection(db,'listings'), where('status','==','approved'));
    const sA = await getDocs(qA);
    const itemsA = sA.docs.map(d=>({id:d.id, ...d.data()}))
      .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    setLine('dbg-approved', `Approved query OK: ${itemsA.length} found`);
    if (!itemsA.length) approvedDiv.innerHTML = '<p class="muted">No approved items.</p>';
    else itemsA.forEach(l => approvedDiv.appendChild(toCard(l)));
  } catch (err) {
    console.error('[admin] approved failed', err);
    setLine('dbg-approved', `❌ Approved failed: <code>${err.code || err.message}</code>`, 'alert error');
    approvedDiv.innerHTML = '<p class="muted">Cannot load approved.</p>';
  }
}

async function setStatus(id,status){
  if (!confirm(`Set status to ${status}?`)) return;
  await updateDoc(doc(db,'listings',id), { status, updatedAt: serverTimestamp() });
  await loadBuckets();
}
async function removeListing(id){
  if (!confirm('Remove permanently?')) return;
  await deleteDoc(doc(db,'listings',id));
  await loadBuckets();
}

// ---- Start immediately if DOM is already ready; otherwise wait ----
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[admin] DOM ready (listener)');
    start().catch(e => {
      console.error('[admin] start failed (listener)', e);
      showDebug(`<div class="alert error">Start failed: ${e.message}</div>`);
    });
  });
} else {
  console.log('[admin] DOM already ready -> starting now');
  start().catch(e => {
    console.error('[admin] start failed (immediate)', e);
    showDebug(`<div class="alert error">Start failed: ${e.message}</div>`);
  });
}
