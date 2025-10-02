// js/app.js
// Auth + Nav (hamburger + mobile submenus) + helpers
// - Redirect to home on logout
// - Separate Sign in and Sign up modals
// - No Firestore composite indexes (sort client-side)

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

// ---- Firebase init ----
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

// Persist session (wrapped; no top-level await)
(async () => {
  try { await setPersistence(auth, browserSessionPersistence); }
  catch (e) { console.warn("Auth persistence warning:", e?.message); }
})();

// ---- Nav/auth elements ----
const loginBtn = document.getElementById('btn-login');
const signupBtn = document.getElementById('btn-signup');
const logoutBtn = document.getElementById('btn-logout');
const navDashboard = document.getElementById('nav-dashboard');
const navAdmin = document.getElementById('nav-admin');
const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// ---- Separate modals ----
const loginModal  = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');

const closeLogin  = document.getElementById('closeLogin');
const closeSignup = document.getElementById('closeSignup');

const loginForm   = document.getElementById('emailLoginForm');
const signupForm  = document.getElementById('emailSignupForm');

const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');

function show(el){ el && el.classList.remove('hide'); }
function hide(el){ el && el.classList.add('hide'); }

function openLogin(){ show(loginModal); hide(signupModal); }
function openSignup(){ show(signupModal); hide(loginModal); }
function closeBoth(){ hide(loginModal); hide(signupModal); }

// Open/close buttons
loginBtn   && loginBtn.addEventListener('click', openLogin);
signupBtn  && signupBtn.addEventListener('click', openSignup);
closeLogin && closeLogin.addEventListener('click', ()=> hide(loginModal));
closeSignup&& closeSignup.addEventListener('click', ()=> hide(signupModal));

// ---- Auth flows ----
loginForm && loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    await signInWithEmailAndPassword(auth, (loginEmail?.value||'').trim(), loginPassword?.value||'');
    closeBoth();
  }catch(err){ alert(`Sign-in failed: ${err.message}`); }
});

signupForm && signupForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    await createUserWithEmailAndPassword(auth, (signupEmail?.value||'').trim(), signupPassword?.value||'');
    alert('Account created! You are now signed in.');
    closeBoth();
  }catch(err){ alert(`Sign-up failed: ${err.message}`); }
});

// ---- Logout → ALWAYS go home ----
logoutBtn && logoutBtn.addEventListener('click', async ()=>{
  try { await signOut(auth); }
  finally { window.location.href = './'; }  // redirect to homepage from any page
});

// ---- Auth state → nav visibility ----
onAuthStateChanged(auth, (user)=>{
  const loggedIn = !!user;
  if (loginBtn)     loginBtn.classList.toggle('hide', loggedIn);
  if (signupBtn)    signupBtn.classList.toggle('hide', loggedIn);
  if (logoutBtn)    logoutBtn.classList.toggle('hide', !loggedIn);
  if (navDashboard) navDashboard.classList.toggle('hide', !loggedIn);

  if (navAdmin){
    navAdmin.classList.add('hide');
    if (user && user.uid === SUPER_ADMIN_UID) navAdmin.classList.remove('hide');
  }
});

// ---- Hamburger (mobile) ----
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');

function closeMenu(){
  if (!navMenu) return;
  navMenu.classList.remove('show');
  hamburgerBtn?.setAttribute('aria-expanded','false');
}
function toggleMenu(){
  if (!navMenu) return;
  const show = !navMenu.classList.contains('show');
  navMenu.classList.toggle('show', show);
  hamburgerBtn?.setAttribute('aria-expanded', show ? 'true' : 'false');
}
hamburgerBtn && hamburgerBtn.addEventListener('click', (e)=>{
  e.stopPropagation();
  toggleMenu();
});
// close when clicking any link/button inside
navMenu && navMenu.addEventListener('click', (e)=>{
  if (e.target.closest('a') || e.target.closest('button')) closeMenu();
});
// close when clicking outside
document.addEventListener('click', (e)=>{
  if (!navMenu || !navMenu.classList.contains('show')) return;
  const inside = navMenu.contains(e.target);
  const isBtn  = hamburgerBtn && hamburgerBtn.contains(e.target);
  if (!inside && !isBtn) closeMenu();
});

// ---- Submenu toggles (mobile accordion) ----
function isMobile(){ return window.matchMedia('(max-width: 768px)').matches; }
function closeAllSubmenus(){
  document.querySelectorAll('#navMenu .submenu').forEach(s => s.classList.remove('show'));
  document.querySelectorAll('#navMenu .sub-toggle[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded','false'));
}
document.querySelectorAll('#navMenu .sub-toggle').forEach(btn=>{
  btn.addEventListener('click', (e)=>{
    if (!isMobile()) return; // desktop handled by CSS hover
    e.preventDefault();
    const submenu = btn.nextElementSibling;
    if (!submenu) return;
    const isOpen = submenu.classList.contains('show');
    closeAllSubmenus();
    if (!isOpen){
      submenu.classList.add('show');
      btn.setAttribute('aria-expanded','true');
    }
  });
});
document.addEventListener('click', (e)=>{
  if (!isMobile()) return;
  const insideMenu = navMenu && navMenu.contains(e.target);
  const isHamb = hamburgerBtn && hamburgerBtn.contains(e.target);
  if (!insideMenu && !isHamb) closeAllSubmenus();
});
navMenu && navMenu.addEventListener('click', (e)=>{
  if (!isMobile()) return;
  if (e.target.closest('.submenu a')) closeAllSubmenus();
});

// ---- Helpers (no Firestore composite indexes; sort client-side) ----
export async function getApprovedListings(filters = {}){
  const q = query(collection(db,'listings'), where('status','==','approved'));
  const snap = await getDocs(q);
  let items = snap.docs.map(d=>({id:d.id, ...d.data()}));
  items.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)); // newest first

  if (filters.type)          items = items.filter(x => x.type === filters.type);
  if (filters.propertyType)  items = items.filter(x => x.propertyType === filters.propertyType);
  if (filters.city)          items = items.filter(x => (x.city||'').toLowerCase() === String(filters.city).toLowerCase());
  if (filters.minPrice)      items = items.filter(x => Number(x.price) >= Number(filters.minPrice));
  if (filters.maxPrice)      items = items.filter(x => Number(x.price) <= Number(filters.maxPrice));
  return items;
}
export function currencyFmt(v, code='MUR'){
  try { return new Intl.NumberFormat(undefined,{style:'currency',currency:code,maximumFractionDigits:0}).format(v); }
  catch { return `${v} ${code}`; }
}
export function listingLink(id){ return `listing.html?id=${encodeURIComponent(id)}`; }
export function firstImage(l){ return (l.images && l.images[0]) || ''; }

export async function requireAuth(){
  return new Promise((res,rej)=>{
    const unsub = onAuthStateChanged(auth, u => {
      unsub();
      if (u) res(u);
      else {
        alert('Please sign in first.');
        window.location.href = './';
        rej(new Error('Not authenticated'));
      }
    });
  });
}

export { auth, db };
