import { requireAuth, db, currencyFmt, SUPER_ADMIN_UID } from './app.js';
import {
  collection, query, where, getDocs,
  doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const pendingDiv = document.getElementById('pending');
const approvedDiv = document.getElementById('approved');
const tpl = document.getElementById('adminCardTpl');

async function requireSuperAdmin(){
  const user = await requireAuth();
  if (user.uid !== SUPER_ADMIN_UID){ alert('Admins only'); location.href='./'; throw new Error('Not super-admin'); }
}

function card(l){
  const el = tpl.content.firstElementChild.cloneNode(true);
  el.querySelector('.card-img').style.backgroundImage = `url('${(l.images&&l.images[0])||''}')`;
  el.querySelector('.card-title').textContent = l.title;
  el.querySelector('.card-meta').textContent = `${l.propertyType} • ${l.city}, ${l.country} • Owner: ${l.ownerUid.slice(0,6)}…`;
  el.querySelector('.card-price').textContent = currencyFmt(l.price,l.currency) + (l.type==='rent'?' / mo':'');
  el.querySelector('.approve').onclick = ()=> setStatus(l.id,'approved');
  el.querySelector('.reject').onclick  = ()=> setStatus(l.id,'rejected');
  el.querySelector('.remove').onclick  = ()=> removeListing(l.id);
  return el;
}
async function setStatus(id,status){ if(!confirm(`Set status to ${status}?`))return; await updateDoc(doc(db,'listings',id),{status,updatedAt:serverTimestamp()}); load(); }
async function removeListing(id){ if(!confirm('Remove permanently?'))return; await deleteDoc(doc(db,'listings',id)); load(); }

async function load(){
  await requireSuperAdmin();

  // Pending
  pendingDiv.innerHTML='';
  let snap = await getDocs(query(collection(db,'listings'), where('status','==','pending')));
  let items = snap.docs.map(d=>({id:d.id, ...d.data()}));
  items.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  if (!items.length) pendingDiv.innerHTML='<p class="muted">No pending items.</p>';
  else for (const it of items) pendingDiv.appendChild(card(it));

  // Approved
  approvedDiv.innerHTML='';
  snap = await getDocs(query(collection(db,'listings'), where('status','==','approved')));
  items = snap.docs.map(d=>({id:d.id, ...d.data()}));
  items.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  if (!items.length) approvedDiv.innerHTML='<p class="muted">No approved items.</p>';
  else for (const it of items) pendingDiv.parentElement.nextElementSibling.nextElementSibling.appendChild(card(it)); // or approvedDiv.appendChild(card(it))
}
load();
