// js/listing.js
// Detail page helpers:
// - record "recently viewed"
// - favorite toggle (Save/Unsave) for this listing

import { db, auth, requireAuth } from './app.js';
import {
  doc, getDoc, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

function getListingId() {
  const p = new URLSearchParams(location.search);
  return p.get('id') || '';
}
function setFavBtnState(btn, active) {
  if (!btn) return;
  btn.classList.toggle('active', !!active);
  btn.textContent = active ? '♥ Saved' : '♡ Save';
}

// Recently viewed
(function recordRecent() {
  const id = getListingId(); if (!id) return;
  const key = 'recentListings';
  const arr = JSON.parse(localStorage.getItem(key) || '[]').filter(x => x !== id);
  arr.push(id);
  localStorage.setItem(key, JSON.stringify(arr.slice(-20)));
})();

// Favorite button
(async function initFavorite(){
  const favBtn = document.getElementById('detailFav');
  if (!favBtn) return;
  const listingId = getListingId(); if (!listingId) return;

  try {
    const u = auth.currentUser;
    if (u) {
      const snap = await getDoc(doc(db, 'users', u.uid, 'favorites', listingId));
      setFavBtnState(favBtn, snap.exists());
    } else {
      setFavBtnState(favBtn, false);
    }
  } catch { setFavBtnState(favBtn, false); }

  favBtn.addEventListener('click', async ()=>{
    try {
      const u = await requireAuth();
      const ref = doc(db, 'users', u.uid, 'favorites', listingId);
      const active = favBtn.classList.contains('active');
      favBtn.disabled = true;
      if (active) {
        await deleteDoc(ref);
        setFavBtnState(favBtn, false);
      } else {
        await setDoc(ref, { addedAt: serverTimestamp() }, { merge: true });
        setFavBtnState(favBtn, true);
      }
    } catch {
      // requireAuth already handles sign-in prompt/redirect
    } finally {
      favBtn.disabled = false;
    }
  });
})();
