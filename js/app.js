// js/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export const SUPER_ADMIN_UID = "WxvIqW6fmMVz2Us8AQBO9htcaAT2";

const firebaseConfig = {
  apiKey: "AIzaSyBA_hgPBgcwrkQJdxhIYFKd8GzmFee_l-I",
  authDomain: "affordable-properties.firebaseapp.com",
  projectId: "affordable-properties",
  storageBucket: "affordable-properties.firebasestorage.app",
  messagingSenderId: "483837713112",
  appId: "1:483837713112:web:8232658b5dfd13aa1995ad",
  measurementId: "G-EF9PN8SZGQ"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Footer year
const yearSpan = document.getElementById('year');
if (yearSpan) yearSpan.textContent = new Date().getFullYear();

// Common header controls (if present)
const btnLogin  = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const btnLogout = document.getElementById('btn-logout');
const navAdmin  = document.getElementById('nav-admin');
const navDash   = document.getElementById('nav-dashboard');
const authStatus= document.getElementById('authStatus');

if (btnLogout) {
  btnLogout.addEventListener('click', async ()=>{
    try { await signOut(auth); } finally { window.location.href = './'; }
  });
}

onAuthStateChanged(auth, (user) => {
  const loggedIn = !!user;
  if (btnLogin)   btnLogin.classList.toggle('hide',  loggedIn);
  if (btnSignup)  btnSignup.classList.toggle('hide', loggedIn);
  if (btnLogout)  btnLogout.classList.toggle('hide', !loggedIn);
  if (navDash)    navDash.classList.toggle('hide', !loggedIn);
  if (navAdmin)   navAdmin.classList.toggle('hide', !(loggedIn && user.uid === SUPER_ADMIN_UID));
  if (authStatus) authStatus.textContent = loggedIn ? 'Logged in' : 'Logged out';
});

// Require-auth helper: redirects home if logged out
export async function requireAuth() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      if (u) resolve(u);
      else { alert('Please sign in first.'); window.location.href = './'; reject(new Error('Not signed in')); }
    });
  });
}

export function currencyFmt(v, code='MUR'){
  try { return new Intl.NumberFormat(undefined,{style:'currency',currency:code,maximumFractionDigits:0}).format(v); }
  catch { return `${v} ${code}`; }
}
