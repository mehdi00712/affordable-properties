// js/listings.js
// Listings + Filters + Favorites (♥) + Save Search + Recently Viewed + Saved Grid

import { db, auth, requireAuth, getApprovedListings, currencyFmt, listingLink, firstImage, getListingsByIds } from './app.js';
import {
  doc, setDoc, deleteDoc, serverTimestamp, collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const grid = document.getElementById('listingsGrid');
const cardTpl = document.getElementById('cardTpl');
const filtersForm = document.getElementById('filtersForm');
const recentRow = document.getElementById('recentRow');

// Saved grid
const savedGrid = document.getElementById('savedGrid');
const savedEmpty = document.getElementById('savedEmpty');

const $ = (sel, root=document) => root.querySelector(sel);

// ---------- Filters ----------
function readFilters() {
  const type = $('#fType')?.value || '';
  const propertyType = $('#fPropType')?.value || '';
  const city = $('#fCity')?.value || '';
  const minPrice = $('#fMin')?.value || '';
  const maxPrice = $('#fMax')?.value || '';
  const beds = $('#fBeds')?.value || '';
  return {
    type: type || undefined,
    propertyType: propertyType || undefined,
    city: city || undefined,
    minPrice: minPrice || undefined,
    maxPrice: maxPrice || undefined,
    beds: beds || undefined
  };
}
function matchesBeds(item, bedsMin) {
  if (!bedsMin) return true;
  return Number(item.bedrooms || 0) >= Number(bedsMin);
}
function filtersToQueryString() {
  const f = readFilters();
  const params = new URLSearchParams();
  Object.entries(f).forEach(([k,v])=>{ if (v) params.set(k, v); });
  const qs = params.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}
filtersForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  filtersToQueryString();
  await loadListings();
});
$('#btnReset')?.addEventListener('click', async ()=>{
  filtersForm.reset();
  filtersToQueryString();
  await loadListings();
});
$('#btnSaveSearch')?.addEventListener('click', async ()=>{
  try {
    const user = await requireAuth();
    const criteria = readFilters();
    await setDoc(doc(collection(db, 'users', user.uid, 'saved_searches')), {
      criteria, createdAt: serverTimestamp(), name: humanizeCriteria(criteria)
    });
    alert('Search saved!');
  } catch {}
});
function humanizeCriteria(c) {
  const parts = [];
  if (c.type) parts.push(c.type === 'sale' ? 'For sale' : 'To rent');
  if (c.propertyType) parts.push(c.propertyType);
  if (c.city) parts.push(c.city);
  if (c.beds) parts.push(`${c.beds}+ beds`);
  if (c.minPrice || c.maxPrice) parts.push(`${c.minPrice||'0'} - ${c.maxPrice||'∞'}`);
  return parts.join(' • ') || 'All properties';
}

// ---------- Favorites core ----------
async function getFavoriteIds() {
  return new Promise(res=>{
    const u = auth.currentUser;
    if (!u) return res(new Set());
    (async ()=>{
      try {
        const snap = await getDocs(collection(db, 'users', u.uid, 'favorites'));
        res(new Set(snap.docs.map(d=>d.id)));
      } catch { res(new Set()); }
    })();
  });
}

async function addFavorite(listingId) {
  const u = await requireAuth();
  await setDoc(doc(db, 'users', u.uid, 'favorites', listingId), { addedAt: serverTimestamp() }, { merge: true });
}
async function removeFavorite(listingId) {
  const u = await requireAuth();
  await deleteDoc(doc(db, 'users', u.uid, 'favorites', listingId));
}

// Toggle from a listing card heart
async function toggleFavoriteFromCard(listingId, likeBtn) {
  const wasActive = likeBtn.classList.contains('active');
  likeBtn.disabled = true;
  try {
    if (wasActive) {
      await removeFavorite(listingId);
      likeBtn.classList.remove('active');
      likeBtn.innerHTML = '♡';
    } else {
      await addFavorite(listingId);
      likeBtn.classList.add('active');
      likeBtn.innerHTML = '♥';
    }
    await loadSavedGrid();
  } catch {
    alert('Could not update favorites. Please try again.');
  } finally {
    likeBtn.disabled = false;
  }
}

// ---------- Listings render ----------
async function loadListings() {
  if (!grid) return;
  grid.innerHTML = '<p class="muted">Loading…</p>';

  const f = readFilters();
  let items = await getApprovedListings(f);
  if (f.beds) items = items.filter(x => matchesBeds(x, f.beds));

  if (!items.length) { grid.innerHTML = '<p class="muted">No results. Try adjusting filters.</p>'; return; }

  const favIds = await getFavoriteIds();
  grid.innerHTML = '';

  for (const l of items) {
    const node = cardTpl.content.firstElementChild.cloneNode(true);
    node.href = listingLink(l.id);
    node.querySelector('.card-img').style.backgroundImage = `url('${firstImage(l)}')`;
    node.querySelector('.card-title').textContent = l.title || '(no title)';
    node.querySelector('.card-meta').textContent =
      `${l.propertyType || '-'} • ${l.bedrooms ?? '-'} bd • ${l.city || '-'}, ${l.country || '-'}`;
    node.querySelector('.card-price').textContent =
      currencyFmt(l.price || 0, l.currency || 'MUR') + (l.type === 'rent' ? ' / mo' : '');

    // Heart button
    const likeBtn = node.querySelector('.card-like');
    if (favIds.has(l.id)) { likeBtn.classList.add('active'); likeBtn.innerHTML = '♥'; }
    likeBtn.addEventListener('click', (e)=>{
      e.preventDefault(); e.stopPropagation();
      toggleFavoriteFromCard(l.id, likeBtn);
    });

    grid.appendChild(node);
  }
}

// ---------- Recently viewed (row) ----------
async function loadRecent() {
  if (!recentRow) return;
  const ids = JSON.parse(localStorage.getItem('recentListings') || '[]');
  if (!ids.length) { recentRow.innerHTML = '<p class="muted">Nothing viewed yet.</p>'; return; }

  const items = await getListingsByIds(ids.slice(-12).reverse());
  if (!items.length) { recentRow.innerHTML = '<p class="muted">Nothing viewed yet.</p>'; return; }

  recentRow.innerHTML = '';
  for (const l of items) {
    const node = cardTpl.content.firstElementChild.cloneNode(true);
    node.href = listingLink(l.id);
    node.querySelector('.card-img').style.backgroundImage = `url('${firstImage(l)}')`;
    node.querySelector('.card-title').textContent = l.title || '(no title)';
    node.querySelector('.card-meta').textContent = `${l.propertyType || '-'} • ${l.bedrooms ?? '-'} bd • ${l.city || '-'}`;
    node.querySelector('.card-price').textContent =
      currencyFmt(l.price || 0, l.currency || 'MUR') + (l.type === 'rent' ? ' / mo' : '');
    // keep recent row light → remove heart
    node.querySelector('.card-like')?.remove();
    recentRow.appendChild(node);
  }
}

// ---------- Saved grid (full cards with Remove) ----------
async function loadSavedGrid() {
  if (!savedGrid) return;
  if (!auth.currentUser) {
    savedGrid.innerHTML = '';
    if (savedEmpty) { savedEmpty.style.display = 'block'; savedEmpty.textContent = 'Sign in to see your saved properties.'; }
    return;
  }

  if (savedEmpty) savedEmpty.style.display = 'none';
  savedGrid.innerHTML = '<p class="muted">Loading saved…</p>';

  try {
    const favSnap = await getDocs(collection(db, 'users', auth.currentUser.uid, 'favorites'));
    const favIds = favSnap.docs.map(d => d.id);
    if (!favIds.length) {
      savedGrid.innerHTML = '';
      if (savedEmpty) { savedEmpty.style.display = 'block'; savedEmpty.textContent = "You haven't saved any properties yet."; }
      return;
    }

    const items = await getListingsByIds(favIds);
    savedGrid.innerHTML = '';
    for (const l of items) {
      const node = cardTpl.content.firstElementChild.cloneNode(true);
      node.href = listingLink(l.id);
      node.querySelector('.card-img').style.backgroundImage = `url('${firstImage(l)}')`;
      node.querySelector('.card-title').textContent = l.title || '(no title)';
      node.querySelector('.card-meta').textContent =
        `${l.propertyType || '-'} • ${l.bedrooms ?? '-'} bd • ${l.city || '-'}, ${l.country || '-'}`;
      node.querySelector('.card-price').textContent =
        currencyFmt(l.price || 0, l.currency || 'MUR') + (l.type === 'rent' ? ' / mo' : '');

      // Replace heart with a Remove button in Saved section
      const likeBtn = node.querySelector('.card-like');
      const removeBtn = document.createElement('button');
      removeBtn.className = 'btn small danger';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', async (e)=>{
        e.preventDefault(); e.stopPropagation();
        try { await removeFavorite(l.id); await loadSavedGrid(); }
        catch { alert('Could not remove. Try again.'); }
      });
      likeBtn.replaceWith(removeBtn);

      savedGrid.appendChild(node);
    }
  } catch (e) {
    savedGrid.innerHTML = '<p class="muted">Error loading saved items.</p>';
    console.error(e);
  }
}

// ---------- Init ----------
(function initFromQuery(){
  const p = new URLSearchParams(location.search);
  $('#fCity')     && p.get('city') && ($('#fCity').value = p.get('city'));
  $('#fType')     && p.get('type') && ($('#fType').value = p.get('type'));
  $('#fPropType') && p.get('propertyType') && ($('#fPropType').value = p.get('propertyType'));
  $('#fMin')      && p.get('minPrice') && ($('#fMin').value = p.get('minPrice'));
  $('#fMax')      && p.get('maxPrice') && ($('#fMax').value = p.get('maxPrice'));
  $('#fBeds')     && p.get('beds') && ($('#fBeds').value = p.get('beds'));
})();

loadListings();
loadRecent();
loadSavedGrid();

// Refresh Saved grid on auth change
onAuthStateChanged(auth, () => loadSavedGrid());
