// js/app.js  (Firebase v10 modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, getDoc, collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// --- Firebase init (your provided config) ---
const firebaseConfig = {
  apiKey: "AIzaSyBA_hgPBgcwrkQJdxhIYFKd8GzmFee_l-I",
  authDomain: "affordable-properties.firebaseapp.com",
  projectId: "affordable-properties",
  storageBucket: "affordable-properties.firebasestorage.app",
  messagingSenderId: "483837713112",
  appId: "1:483837713112:web:8232658b5dfd13aa1995ad",
  measurementId: "G-EF9PN8SZGQ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Navbar elements ---
const loginBtn = document.getElementById('btn-login');
const logoutBtn = document.getElementById('btn-logout');
const navDashboard = document.getElementById('nav-dashboard');
const navAdmin = document.getElementById('nav-admin');
const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// Brand
const brandAnchor = document.querySelector('.brand a');
if (brandAnchor) brandAnchor.textContent = 'Affordable Properties';

// --- Buttons ---
if (loginBtn) {
  loginBtn.onclick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e) {
      alert('Login error: ' + e.message);
      console.error(e);
    }
  };
}
if (logoutBtn) logoutBtn.onclick = () => signOut(auth);

// --- Auth state ---
onAuthStateChanged(auth, async (user) => {
  const loggedIn = !!user;
  if (loginBtn) loginBtn.classList.toggle('hide', loggedIn);
  if (logoutBtn) logoutBtn.classList.toggle('hide', !loggedIn);
  if (navDashboard) navDashboard.classList.toggle('hide', !loggedIn);
  if (navAdmin) navAdmin.classList.add('hide'); // hide by default

  if (user) {
    try {
      const roleSnap = await getDoc(doc(db, 'roles', user.uid));
      const isAdmin = roleSnap.exists() && roleSnap.data().role === 'admin';
      if (isAdmin && navAdmin) navAdmin.classList.remove('hide');
    } catch (err) { console.warn('Role check failed', err); }
  }
});

// -------- Helpers (exported) --------
export async function getApprovedListings(filters = {}) {
  // Base query: approved, newest first
  const q = query(
    collection(db, 'listings'),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  const snap = await getDocs(q);
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Client filter (simpler than composite indexes for MVP)
  if (filters.type) items = items.filter(x => x.type === filters.type);
  if (filters.propertyType) items = items.filter(x => x.propertyType === filters.propertyType);
  if (filters.city) items = items.filter(x => (x.city || '').toLowerCase() === filters.city.toLowerCase());
  if (filters.minPrice) items = items.filter(x => Number(x.price) >= Number(filters.minPrice));
  if (filters.maxPrice) items = items.filter(x => Number(x.price) <= Number(filters.maxPrice));

  return items;
}

export function currencyFmt(value, code = 'MUR') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(value);
  } catch { return `${value} ${code}`; }
}
export function listingLink(id) { return `listing.html?id=${encodeURIComponent(id)}`; }
export function firstImage(listing) { return (listing.images && listing.images[0]) || ''; }

export async function requireAuth() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      if (u) resolve(u);
      else {
        alert('Please login first.');
        window.location.href = './';
        reject(new Error('Not authenticated'));
      }
    });
  });
}

export { auth, db };
