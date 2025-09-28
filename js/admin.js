// js/admin.js
import { requireAuth, db, currencyFmt, SUPER_ADMIN_UID } from './app.js';
import {
  collection, query, where, getDocs,
  doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    console.error(err);
    const root = document.querySelector('main .wrap') || document.body;
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = `Could not load admin: ${err.message}`;
    root.appendChild(p);
  });
});

async function init(){
  const user = await requireAuth();
  if (user.uid !== SUPER_ADMIN_UID){
    alert('Admins only'); window.location.href = './'; return;
  }
  await load();
}

function getEls(){
  return {
    pendingDiv: document.getElementById('pending'),
    approvedDiv: document.getElementById('approved'),
    tpl: document.getElementById('adminCardTpl'),
  };
}

function makeCardElement(){
  const { tpl } = getEls();
  if (tpl && tpl.content && tpl.content.firstElementChild){
    return tpl.content.firstElementChild.cloneNode(true);
  }
  // Fallback simple card if template missing
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

function card(l){
  const el = makeCardElement();
  const img = el.querySelector('.card-img');
  const title = el.querySelector('.card-title');
  const meta = el.querySelector('.card-meta');
  const price = el.querySelector('.card-price');
  const btnApprove = el.querySelector('.approve');
  const btnReject  = el.querySelector('.reject');
  const btnRemove  = el.querySelector('.remove');

  if (img) img.style.backgroundImage = `url('${(l.images && l.images[0]) || ''}')`;
  if (title) title.textContent = l.title || '(untitled)';
  if (meta) meta.textContent = `${l.propertyType||'-'} • ${l.city||'-'}, ${l.country||'-'} • Owner: ${(l.ownerUid||'').slice(0,6)}…`;
  if (price) price.textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / mo':'');

  btnApprove && (btnApprove.onclick = ()=> setStatus(l.id,'approved'));
  btnReject  && (btnReject .onclick = ()=> setStatus(l.id,'rejected'));
  btnRemove  && (btnRemove .onclick = ()=> removeListing(l.id));

  return el;
}

async function setStatus(id,status){
  if (!confirm(`Set status to ${status}?`)) return;
  await updateDoc(doc(db,'listings',id), { status, updatedAt: serverTimestamp() });
  await load();
}
async function removeListing(id){
  if (!confirm('Remove permanently?')) return;
  await deleteDoc(doc(db,'listings',id));
  await load();
}

async function load(){
  const { pendingDiv, approvedDiv } = getEls();
  if (!pendingDiv || !approvedDiv) throw new Error('Admin containers not found');

  // Pending
  pendingDiv.innerHTML = '';
  let snap = await getDocs(query(collection(db,'listings'), where('status','==','pending')));
  let items = snap.docs.map(d=>({id:d.id, ...d.data()}));
  items.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  if (!items.length) pendingDiv.innerHTML = '<p class="muted">No pending items.</p>';
  else items.forEach(it => pendingDiv.appendChild(card(it)));

  // Approved
  approvedDiv.innerHTML = '';
  snap = await getDocs(query(collection(db,'listings'), where('status','==','approved')));
  items = snap.docs.map(d=>({id:d.id, ...d.data()}));
  items.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  if (!items.length) approvedDiv.innerHTML = '<p class="muted">No approved items.</p>';
  else items.forEach(it => approvedDiv.appendChild(card(it)));
}
