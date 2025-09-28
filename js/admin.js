// js/admin.js — Moderation (Pending/Approved) with templates + fallbacks
import { requireAuth, db, currencyFmt, SUPER_ADMIN_UID } from './app.js';
import {
  collection, query, where, getDocs,
  doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function debugBox(){
  let box = document.getElementById('admin-debug');
  if (!box){
    box = document.createElement('div');
    box.id = 'admin-debug';
    box.className = 'panel';
    box.style.cssText = 'margin:12px 0 16px;padding:12px;border:1px solid #eee;border-radius:12px';
    const main = document.querySelector('main .wrap') || document.querySelector('main') || document.body;
    main.insertBefore(box, main.firstChild);
  }
  return box;
}
function setLine(id, html, cls='muted'){
  const box = debugBox();
  let el = document.getElementById(id);
  if (!el){ el = document.createElement('div'); el.id = id; box.appendChild(el); }
  el.className = cls; el.innerHTML = html;
}

async function start(){
  const user = await requireAuth();
  setLine('dbg-user', `Signed in as: <code>${user.email || '(no email)'}</code>`);
  setLine('dbg-uid',  `UID: <code>${user.uid}</code> (expected: <code>${SUPER_ADMIN_UID}</code>)`);
  if (user.uid !== SUPER_ADMIN_UID){
    setLine('dbg-admin', `<span class="alert error">Admins only. Redirecting…</span>`, 'alert error');
    alert('Admins only'); window.location.href = './'; return;
  } else {
    setLine('dbg-admin', `<span class="alert success">Super admin verified.</span>`, 'alert success');
  }
  await render();
}

function templateCard(){
  const tpl = document.getElementById('adminCardTpl');
  if (tpl && tpl.content && tpl.content.firstElementChild){
    return tpl.content.firstElementChild.cloneNode(true);
  }
  // fallback
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
  const el = templateCard();
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

async function setStatus(id,status){
  if (!confirm(`Set status to ${status}?`)) return;
  await updateDoc(doc(db,'listings',id), { status, updatedAt: serverTimestamp() });
  await render();
}
async function removeListing(id){
  if (!confirm('Remove permanently?')) return;
  await deleteDoc(doc(db,'listings',id));
  await render();
}

async function render(){
  const pendingDiv  = document.getElementById('pending');
  const approvedDiv = document.getElementById('approved');
  pendingDiv.innerHTML = ''; approvedDiv.innerHTML = '';

  // Pending
  try{
    const snap = await getDocs(query(collection(db,'listings'), where('status','==','pending')));
    const items = snap.docs.map(d=>({id:d.id, ...d.data()}))
      .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    setLine('dbg-pending', `Pending found: ${items.length}`);
    if (!items.length) pendingDiv.innerHTML = '<p class="muted">No pending items.</p>';
    else items.forEach(l => pendingDiv.appendChild(toCard(l)));
  } catch (err){
    console.error('[admin] pending failed', err);
    setLine('dbg-pending', `Pending failed: ${err.code || err.message}`, 'alert error');
  }

  // Approved
  try{
    const snapA = await getDocs(query(collection(db,'listings'), where('status','==','approved')));
    const itemsA = snapA.docs.map(d=>({id:d.id, ...d.data()}))
      .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    setLine('dbg-approved', `Approved found: ${itemsA.length}`);
    if (!itemsA.length) approvedDiv.innerHTML = '<p class="muted">No approved items.</p>';
    else itemsA.forEach(l => approvedDiv.appendChild(toCard(l)));
  } catch (err){
    console.error('[admin] approved failed', err);
    setLine('dbg-approved', `Approved failed: ${err.code || err.message}`, 'alert error');
  }
}

// Start immediately if DOM is ready (GitHub Pages caches aggressively)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { start().catch(e => showFatal(e)); });
} else {
  start().catch(e => showFatal(e));
}
function showFatal(e){
  console.error('[admin] fatal', e);
  const b = debugBox(); b.innerHTML = `<div class="alert error">Admin failed: ${e.message}</div>`;
}
