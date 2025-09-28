// js/admin.js
import { requireAuth, db, currencyFmt, SUPER_ADMIN_UID } from './app.js';
import {
  collection, query, where, getDocs,
  doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function setLine(id, html, cls='muted'){
  const box = document.getElementById('admin-debug');
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

function cardTpl(){
  const tpl = document.getElementById('adminCardTpl');
  if (tpl?.content?.firstElementChild) return tpl.content.firstElementChild.cloneNode(true);
  const d = document.createElement('div');
  d.className = 'card';
  d.innerHTML = `
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
  return d;
}

function toCard(l){
  const el = cardTpl();
  const title = el.querySelector('.card-title');
  const meta  = el.querySelector('.card-meta');
  const price = el.querySelector('.card-price');
  const bA = el.querySelector('.approve');
  const bR = el.querySelector('.reject');
  const bD = el.querySelector('.remove');

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

  try{
    const pSnap = await getDocs(query(collection(db,'listings'), where('status','==','pending')));
    const pending = pSnap.docs.map(d=>({id:d.id, ...d.data()}))
      .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    setLine('dbg-pending', `Pending found: ${pending.length}`);
    pending.length ? pending.forEach(l=> pendingDiv.appendChild(toCard(l)))
                   : pendingDiv.innerHTML = '<p class="muted">No pending items.</p>';
  }catch(e){
    console.error('[admin] pending failed', e);
    setLine('dbg-pending', `Pending failed: ${e.code || e.message}`, 'alert error');
  }

  try{
    const aSnap = await getDocs(query(collection(db,'listings'), where('status','==','approved')));
    const approved = aSnap.docs.map(d=>({id:d.id, ...d.data()}))
      .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    setLine('dbg-approved', `Approved found: ${approved.length}`);
    approved.length ? approved.forEach(l=> approvedDiv.appendChild(toCard(l)))
                    : approvedDiv.innerHTML = '<p class="muted">No approved items.</p>';
  }catch(e){
    console.error('[admin] approved failed', e);
    setLine('dbg-approved', `Approved failed: ${e.code || e.message}`, 'alert error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => start().catch(e => console.error(e)));
} else {
  start().catch(e => console.error(e));
}
