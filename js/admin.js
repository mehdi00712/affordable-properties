// js/admin.js
import { requireAuth, db, currencyFmt, SUPER_ADMIN_UID } from './app.js';
import {
  collection, query, where, getDocs,
  doc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const pendingDiv  = document.getElementById('pending');
const approvedDiv = document.getElementById('approved');
const tpl         = document.getElementById('adminCardTpl');

async function requireSuperAdmin() {
  const user = await requireAuth();
  if (user.uid !== SUPER_ADMIN_UID) {
    alert('Admins only');
    location.href = './';
    throw new Error('Not super-admin');
  }
}

function makeCard(l) {
  const el = tpl.content.firstElementChild.cloneNode(true);
  el.querySelector('.card-img').style.backgroundImage = `url('${(l.images && l.images[0]) || ''}')`;
  el.querySelector('.card-title').textContent = l.title || '(no title)';
  el.querySelector('.card-meta').textContent =
    `${l.propertyType || '-'} • ${l.city || '-'}, ${l.country || '-'} • Owner: ${String(l.ownerUid || '').slice(0,6)}…`;
  el.querySelector('.card-price').textContent =
    currencyFmt(l.price || 0, l.currency || 'MUR') + (l.type === 'rent' ? ' / mo' : '');
  el.querySelector('.approve')?.addEventListener('click', () => setStatus(l.id, 'approved'));
  el.querySelector('.reject')?.addEventListener('click',  () => setStatus(l.id, 'rejected'));
  el.querySelector('.remove')?.addEventListener('click',  () => removeListing(l.id));
  return el;
}

async function setStatus(id, status) {
  if (!confirm(`Set status to ${status}?`)) return;
  try {
    await updateDoc(doc(db, 'listings', id), { status, updatedAt: serverTimestamp() });
  } catch (e) {
    alert(`Failed to update status: ${e.message}`);
  } finally {
    await loadAll();
  }
}

async function removeListing(id) {
  if (!confirm('Remove this listing permanently?')) return;
  try {
    await deleteDoc(doc(db, 'listings', id));
  } catch (e) {
    alert(`Failed to remove: ${e.message}`);
  } finally {
    await loadAll();
  }
}

function sortByCreatedAtDesc(items) {
  return items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

async function loadSection(container, status) {
  container.innerHTML = '<p class="muted">Loading…</p>';
  try {
    const snap = await getDocs(query(collection(db, 'listings'), where('status', '==', status)));
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    items = sortByCreatedAtDesc(items);

    container.innerHTML = '';
    if (!items.length) {
      container.innerHTML = `<p class="muted">No ${status} items.</p>`;
      return;
    }
    for (const it of items) container.appendChild(makeCard(it));
  } catch (e) {
    console.error(e);
    container.innerHTML = `<p class="muted">Failed to load ${status}: ${e.message}</p>`;
  }
}

async function loadAll() {
  await requireSuperAdmin();
  await Promise.all([
    loadSection(pendingDiv,  'pending'),
    loadSection(approvedDiv, 'approved')
  ]);
}

loadAll();
