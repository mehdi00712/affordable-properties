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

// ---------- DOM refs ----------
const loginBtn   = document.getElementById('btn-login');
const signupBtn  = document.getElementById('btn-signup');
const logoutBtn  = document.getElementById('btn-logout');
const navDashboard = document.getElementById('nav-dashboard');
const navAdmin     = document.getElementById('nav-admin');
const yearSpan = document.getElementById('year'); if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// hamburger
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu      = document.getElementById('navMenu');
const closeMenu = ()=> navMenu?.classList.remove('show');

// modal
const modal = document.getElementById('authModal');
const authTitle = document.getElementById('authTitle');
const closeAuth = document.getElementById('closeAuth');

const statusBox = document.getElementById('authStatusBox');

const loginForm = document.getElementById('emailLoginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');

const signupForm = document.getElementById('emailSignupForm');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');

const switchToSignup = document.getElementById('switchToSignup');
const switchToSignin = document.getElementById('switchToSignin');
const linkToSignup = document.getElementById('linkToSignup');
const linkToSignin = document.getElementById('linkToSignin');

const openAuthBtn = document.getElementById('btn-open-auth'); // optional on index hero

// ---------- UI helpers ----------
function show(el){ el?.classList.remove('hide'); }
function hide(el){ el?.classList.add('hide'); }

function showModal(){ show(modal); }
function hideModal(){ hide(modal); clearStatus(); }

function clearStatus(){
  if (!statusBox) return;
  statusBox.textContent=''; statusBox.className='alert hide';
}
function showError(msg){
  if (!statusBox) return alert(msg);
  statusBox.textContent = msg; statusBox.className='alert error';
  show(statusBox);
}
function showSuccess(msg){
  if (!statusBox) return alert(msg);
  statusBox.textContent = msg; statusBox.className='alert success';
  show(statusBox);
}

// switch between sign in / sign up modes
function openAuth(mode='signin'){
  clearStatus();
  if (mode === 'signup'){
    authTitle.textContent = 'Create account';
    hide(loginForm); show(signupForm);
    hide(switchToSignup); show(switchToSignin);
  }else{
    authTitle.textContent = 'Sign in';
    show(loginForm); hide(signupForm);
    show(switchToSignup); hide(switchToSignin);
  }
  showModal();
}

// wires
loginBtn  ?.addEventListener('click', ()=>{ closeMenu(); setTimeout(()=>openAuth('signin'),0); });
signupBtn ?.addEventListener('click', ()=>{ closeMenu(); setTimeout(()=>openAuth('signup'),0); });
openAuthBtn?.addEventListener('click', ()=>openAuth('signin')); // hero button
closeAuth ?.addEventListener('click', hideModal);
linkToSignup?.addEventListener('click', (e)=>{ e.preventDefault(); openAuth('signup'); });
linkToSignin?.addEventListener('click', (e)=>{ e.preventDefault(); openAuth('signin'); });

// hamburger behavior
hamburgerBtn?.addEventListener('click', (e)=>{ e.stopPropagation(); navMenu?.classList.toggle('show'); });
navMenu?.addEventListener('click', (e)=>{
  if (e.target.closest('a') || e.target.closest('button')) closeMenu();
});
document.addEventListener('click', (e)=>{
  if (!navMenu?.classList.contains('show')) return;
  const inside = navMenu.contains(e.target);
  const isBtn = hamburgerBtn && hamburgerBtn.contains(e.target);
  if (!inside && !isBtn) closeMenu();
});

// ---------- Auth flows ----------
loginForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  clearStatus();
  const email = loginEmail.value.trim();
  const pass  = loginPassword.value;
  try{
    await signInWithEmailAndPassword(auth, email, pass);
    showSuccess('Sign in successful. Taking you home…');
    setTimeout(()=>{ window.location.href = './'; }, 700);
  }catch(err){
    showError(humanizeAuthError(err, 'signin'));
    // Also offer a quick switch to signup if user not found
    if (err?.code === 'auth/user-not-found') openAuth('signup');
  }
});

signupForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  clearStatus();
  const email = signupEmail.value.trim();
  const pass  = signupPassword.value;
  try{
    await createUserWithEmailAndPassword(auth, email, pass);
    showSuccess('Account created and signed in. Taking you home…');
    setTimeout(()=>{ window.location.href = './'; }, 700);
  }catch(err){
    showError(humanizeAuthError(err, 'signup'));
  }
});

// Logout: hide immediately and always redirect to home
logoutBtn?.addEventListener('click', async ()=>{
  hide(logoutBtn); show(loginBtn); show(signupBtn);
  try{
    await signOut(auth);
  } finally {
    window.location.href = './';
  }
});

// ---------- Auth state -> nav + chip + hint ----------
onAuthStateChanged(auth, (user)=>{
  const loggedIn = !!user;

  loginBtn  && loginBtn .classList.toggle('hide', loggedIn);
  signupBtn && signupBtn.classList.toggle('hide', loggedIn);
  logoutBtn && logoutBtn.classList.toggle('hide', !loggedIn);
  navDashboard && navDashboard.classList.toggle('hide', !loggedIn);

  if (navAdmin){
    navAdmin.classList.add('hide');
    if (user && user.uid === SUPER_ADMIN_UID) navAdmin.classList.remove('hide');
  }

  const hint = document.getElementById('signinHint');
  if (hint) hint.style.display = loggedIn ? 'none' : '';

  const status = document.getElementById('authStatus');
  const avatar = document.getElementById('avatar');
  if (status && avatar){
    if (loggedIn){
      status.textContent = 'Logged in';
      const nameSrc = user.displayName || user.email || user.phoneNumber || 'User';
      const initial = (nameSrc.trim()[0] || 'U').toUpperCase();
      avatar.textContent = initial;
    }else{
      status.textContent = 'Logged out';
      avatar.textContent = '?';
    }
  }
});

// ---------- Helpers ----------
function humanizeAuthError(err, mode){
  const code = err?.code || '';
  const base = mode === 'signin'
    ? 'Could not sign in. '
    : 'Could not create account. ';

  switch(code){
    case 'auth/invalid-email': return base + 'The email address is invalid.';
    case 'auth/user-disabled': return base + 'This user is disabled.';
    case 'auth/user-not-found': return base + 'No account was found for that email. You can create one below.';
    case 'auth/wrong-password': return base + 'Incorrect password.';
    case 'auth/weak-password': return base + 'Password is too weak (min 6 characters).';
    case 'auth/email-already-in-use': return base + 'That email is already in use. Try signing in.';
    case 'auth/network-request-failed': return base + 'Network error. Check your connection and try again.';
    default: return base + (err?.message || 'Please try again.');
  }
}

// Public helpers used by other pages
export async function getApprovedListings(filters = {}){
  const q = query(collection(db,'listings'), where('status','==','approved'));
  const snap = await getDocs(q);
  let items = snap.docs.map(d=>({id:d.id, ...d.data()}));
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
