// js/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, setPersistence, browserSessionPersistence,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export const SUPER_ADMIN_UID = "WxvIqW6fmMVz2Us8AQBO9htcaAT2";

// --- Firebase init ---
const app = initializeApp({
  apiKey:"AIzaSyBA_hgPBgcwrkQJdxhIYFKd8GzmFee_l-I",
  authDomain:"affordable-properties.firebaseapp.com",
  projectId:"affordable-properties",
  storageBucket:"affordable-properties.firebasestorage.app",
  messagingSenderId:"483837713112",
  appId:"1:483837713112:web:8232658b5dfd13aa1995ad",
  measurementId:"G-EF9PN8SZGQ"
});
const auth = getAuth(app);
const db = getFirestore(app);
await setPersistence(auth, browserSessionPersistence);

// --- DOM refs ---
const loginBtn = document.getElementById('btn-login');
const signupBtn = document.getElementById('btn-signup');
const openAuthBtn = document.getElementById('btn-open-auth');
const logoutBtn = document.getElementById('btn-logout');
const navDashboard = document.getElementById('nav-dashboard');
const navAdmin = document.getElementById('nav-admin');
const yearSpan = document.getElementById('year'); if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// Auth modal refs
const modal = document.getElementById('authModal');
const closeAuth = document.getElementById('closeAuth');
const loginForm = document.getElementById('emailLoginForm');
const signupForm = document.getElementById('emailSignupForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');

// --- Modal helpers ---
function openModal(){ modal?.classList.remove('hide'); }
function closeModal(){ modal?.classList.add('hide'); }
loginBtn?.addEventListener('click', openModal);
signupBtn?.addEventListener('click', openModal);
openAuthBtn?.addEventListener('click', openModal);
closeAuth?.addEventListener('click', closeModal);

// --- Auth flows ---
loginForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    await signInWithEmailAndPassword(auth, loginEmail.value.trim(), loginPassword.value);
    closeModal();
  }catch(err){ alert(`Sign-in failed: ${err.message}`); }
});

signupForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    await createUserWithEmailAndPassword(auth, signupEmail.value.trim(), signupPassword.value);
    alert('Account created! You are now signed in.');
    closeModal();
  }catch(err){ alert(`Sign-up failed: ${err.message}`); }
});

// 🚪 Logout: redirect to index from ANY page and update UI immediately
logoutBtn?.addEventListener('click', async ()=>{
  // optimistic UI: hide logout, show sign buttons right away
  logoutBtn.classList.add('hide');
  loginBtn?.classList.remove('hide');
  signupBtn?.classList.remove('hide');

  try{
    await signOut(auth);
  } finally {
    // Always go to home page after logout (works from admin, dashboard, listing, etc.)
    window.location.href = './';
  }
});

// --- Auth state -> toggle UI ---
onAuthStateChanged(auth, (user)=>{
  const loggedIn = !!user;

  // Topbar buttons
  loginBtn && loginBtn.classList.toggle('hide', loggedIn);
  signupBtn && signupBtn.classList.toggle('hide', loggedIn);
  logoutBtn && logoutBtn.classList.toggle('hide', !loggedIn);
  navDashboard && navDashboard.classList.toggle('hide', !loggedIn);

  // Show Admin only to super admin
  if (navAdmin){
    navAdmin.classList.add('hide');
    if (user && user.uid === SUPER_ADMIN_UID) navAdmin.classList.remove('hide');
  }

  // Home-page hint: hide when logged in
  const hint = document.getElementById('signinHint');
  if (hint) hint.style.display = loggedIn ? 'none' : '';

  // User chip status + avatar initial
  const status = document.getElementById('authStatus');
  const avatar = document.getElementById('avatar');
  if (status && avatar){
    if (loggedIn){
      status.textContent = 'Logged in';
      const nameSrc = user.displayName || user.email || user.phoneNumber || 'User';
      const initial = (nameSrc.trim()[0] || 'U').toUpperCase();
      avatar.textContent = initial;
    } else {
      status.textContent = 'Logged out';
      avatar.textContent = '?';
    }
  }
});

// --- Hamburger (mobile) ---
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');
function closeMenu(){ navMenu?.classList.remove('show'); }
hamburgerBtn?.addEventListener('click', (e)=>{ e.stopPropagation(); navMenu?.classList.toggle('show'); });
navMenu?.addEventListener('click', (e)=>{
  // Close when clicking any link or button inside menu
  if (e.target.closest('a') || e.target.closest('button')) closeMenu();
});
document.addEventListener('click', (e)=>{
  if (!navMenu?.classList.contains('show')) return;
  const inside = navMenu.contains(e.target);
  const isBtn = hamburgerBtn && hamburgerBtn.contains(e.target);
  if (!inside && !isBtn) closeMenu();
});

// --- Helpers (no Firestore composite indexes needed) ---
export async function getApprovedListings(filters = {}){
  const q = query(collection(db,'listings'), where('status','==','approved'));
  const snap = await getDocs(q);
  let items = snap.docs.map(d=>({id:d.id, ...d.data()}));
  // Newest first
  items.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

  if (filters.type) items = items.filter(x => x.type === filters.type);
  if (filters.propertyType) items = items.filter(x => x.propertyType === filters.propertyType);
  if (filters.city) items = items.filter(x => (x.city||'').toLowerCase() === filters.city.toLowerCase());
  if (filters.minPrice) items = items.filter(x => Number(x.price) >= Number(filters.minPrice));
  if (filters.maxPrice) items = items.filter(x => Number(x.price) <= Number(filters.maxPrice));
  return items;
}

export function currencyFmt(v, code='MUR'){
  try{ return new Intl.NumberFormat(undefined,{style:'currency',currency:code,maximumFractionDigits:0}).format(v); }
  catch{ return `${v} ${code}`; }
}
export function listingLink(id){ return `listing.html?id=${encodeURIComponent(id)}`; }
export function firstImage(l){ return (l.images && l.images[0]) || ''; }

// Gate pages that require auth
export async function requireAuth(){
  return new Promise((res,rej)=>{
    const unsub = onAuthStateChanged(auth,u=>{
      unsub();
      if (u) res(u);
      else { alert('Please sign in first.'); window.location.href='./'; rej(new Error('Not authenticated')); }
    });
  });
}

export { auth, db };
