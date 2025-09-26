// js/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, setPersistence, browserSessionPersistence,
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, getDoc, collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Your Firebase config (unchanged)
const firebaseConfig = {
  apiKey: "AIzaSyBA_hgPBgcwrkQJdxhIYFKd8GzmFee_l-I",
  authDomain: "affordable-properties.firebaseapp.com",
  projectId: "affordable-properties",
  storageBucket: "affordable-properties.firebasestorage.app",
  messagingSenderId: "483837713112",
  appId: "1:483837713112:web:8232658b5dfd13aa1995ad",
  measurementId: "G-EF9PN8SZGQ"
};

// 🔐 your super-admin UID (only this account sees Admin & can moderate)
export const SUPER_ADMIN_UID = "WxvIqW6fmMVz2Us8AQBO9htcaAT2";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Session-only login (no long persistent auto-login)
await setPersistence(auth, browserSessionPersistence);

// Navbar refs
const loginBtn = document.getElementById('btn-login');
const logoutBtn = document.getElementById('btn-logout');
const navDashboard = document.getElementById('nav-dashboard');
const navAdmin = document.getElementById('nav-admin');
const loginForm = document.getElementById('emailLoginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// Show login form when clicking "Login"
if (loginBtn) loginBtn.onclick = () => { loginForm?.classList.remove('hide'); loginEmail?.focus(); };

// Email + Password sign-in (anyone can register in Firebase Console or via your UI)
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
      loginForm.classList.add('hide');
    } catch (err) {
      alert(`Sign-in failed: ${err.message}`);
      console.error(err);
    }
  });
}

// Logout
if (logoutBtn) {
  logoutBtn.onclick = async () => {
    await signOut(auth);
    loginForm?.classList.remove('hide');
  };
}

// Auth state
onAuthStateChanged(auth, async (user) => {
  const loggedIn = !!user;
  loginBtn && loginBtn.classList.toggle('hide', loggedIn);
  logoutBtn && logoutBtn.classList.toggle('hide', !loggedIn);
  navDashboard && navDashboard.classList.toggle('hide', !loggedIn);
  if (loginForm) loginForm.classList.toggle('hide', loggedIn);

  // Only show Admin to the super-admin UID
  if (navAdmin) {
    navAdmin.classList.add('hide');
    if (user && user.uid === SUPER_ADMIN_UID) navAdmin.classList.remove('hide');
  }
});

// ------- Helpers (unchanged) -------
export async function getApprovedListings(filters = {}) {
  const q = query(
    collection(db, 'listings'),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );
  const snap = await getDocs(q);
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filters.type) items = items.filter(x => x.type === filters.type);
  if (filters.propertyType) items = items.filter(x => x.propertyType === filters.propertyType);
  if (filters.city) items = items.filter(x => (x.city || '').toLowerCase() === filters.city.toLowerCase());
  if (filters.minPrice) items = items.filter(x => Number(x.price) >= Number(filters.minPrice));
  if (filters.maxPrice) items = items.filter(x => Number(x.price) <= Number(filters.maxPrice));
  return items;
}

export function currencyFmt(v, code='MUR'){ try{ return new Intl.NumberFormat(undefined,{style:'currency',currency:code,maximumFractionDigits:0}).format(v);}catch{ return `${v} ${code}`; } }
export function listingLink(id){ return `listing.html?id=${encodeURIComponent(id)}`; }
export function firstImage(l){ return (l.images && l.images[0]) || ''; }

export async function requireAuth(){
  return new Promise((res, rej) => {
    const unsub = onAuthStateChanged(auth, u => { unsub(); if (u) res(u); else { alert('Please login first.'); window.location.href='./'; rej(new Error('Not authenticated')); }});
  });
}

export { auth, db };
