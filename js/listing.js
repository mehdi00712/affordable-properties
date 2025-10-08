// js/listing.js
// Detail page helpers:
// 1) Record "recently viewed" in localStorage
// 2) Favorite toggle (Save/Unsave) per user in Firestore

import { db, auth, requireAuth } from './app.js';
import {
  doc, getDoc, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ------- Utils -------
function getListingId() {
  const p = new URLSearchParams(location.search);
  return p.get('id') || '';
}
function setFavBtnState(btn, active) {
  if (!btn) return;
  btn.classList.toggle('active', !!active);
  btn.textContent = active ? '♥ Saved' : '♡ Save';
}

// ------- Recently viewed -------
(function recordRecent() {
  const id = getListingId(); if (!id) return;
  const key = 'recentListings';
  const arr = JSON.parse(localStorage.getItem(key) || '[]').filter(x => x !== id);
  arr.push(id);
  localStorage.setItem(key, JSON.stringify(arr.slice(-20))); // keep last 20
})();

// ------- Favorite button -------
(async function initFavorite() {
  const favBtn = document.getElementById('detailFav');
  if (!favBtn) return;                       // no button on page
  const listingId = getListingId(); if (!listingId) return;

  // Initial state: if logged-in, check if already favorited
  try {
    const u = auth.currentUser;
    if (u) {
      const favRef = doc(db, 'users', u.uid, 'favorites', listingId);
      const snap = await getDoc(favRef);
      setFavBtnState(favBtn, snap.exists());
    } else {
      setFavBtnState(favBtn, false);         // default for logged-out users
    }
  } catch {
    setFavBtnState(favBtn, false);
  }

  // Toggle on click
  favBtn.addEventListener('click', async () => {
    try {
      const u = await requireAuth();         // will redirect/open sign-in if needed
      const favRef = doc(db, 'users', u.uid, 'favorites', listingId);
      const isActive = favBtn.classList.contains('active');

      favBtn.disabled = true;
      if (isActive) {
        await deleteDoc(favRef);
        setFavBtnState(favBtn, false);
      } else {
        await setDoc(favRef, { addedAt: serverTimestamp() }, { merge: true });
        setFavBtnState(favBtn, true);
      }
    } catch {
      // requireAuth already alerts / redirects if not signed in
    } finally {
      favBtn.disabled = false;
    }
  });
})();
