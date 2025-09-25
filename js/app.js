// Simple auth UI: Google popup OR email sign-in (quick)
const loginBtn = document.getElementById('btn-login');
const logoutBtn = document.getElementById('btn-logout');
const navDashboard = document.getElementById('nav-dashboard');
const navAdmin = document.getElementById('nav-admin');
const yearSpan = document.getElementById('year'); if (yearSpan) yearSpan.textContent = new Date().getFullYear();

if (loginBtn) loginBtn.onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try { await auth.signInWithPopup(provider); } catch (e) { alert(e.message); }
};
if (logoutBtn) logoutBtn.onclick = () => auth.signOut();

auth.onAuthStateChanged(async (user) => {
  if (user) {
    loginBtn && (loginBtn.classList.add('hide'));
    logoutBtn && (logoutBtn.classList.remove('hide'));
    navDashboard && (navDashboard.classList.remove('hide'));

    // check admin role
    try {
      const roleDoc = await db.collection('roles').doc(user.uid).get();
      const isAdmin = roleDoc.exists && roleDoc.data().role === 'admin';
      if (isAdmin) navAdmin && navAdmin.classList.remove('hide');
    } catch {}
  } else {
    loginBtn && (loginBtn.classList.remove('hide'));
    logoutBtn && (logoutBtn.classList.add('hide'));
    navDashboard && (navDashboard.classList.add('hide'));
    navAdmin && (navAdmin.classList.add('hide'));
  }
});

// Helpers
export async function getApprovedListings(filters = {}) {
  let ref = db.collection('listings').where('status','==','approved');
  if (filters.type) ref = ref.where('type','==',filters.type);
  if (filters.propertyType) ref = ref.where('propertyType','==',filters.propertyType);
  if (filters.city) ref = ref.where('city','==',filters.city);
  // price filter: Firestore can't do range on different fields; use one field with compound index or filter client-side
  const snap = await ref.orderBy('createdAt','desc').limit(100).get();
  let items = snap.docs.map(d => ({id:d.id, ...d.data()}));
  if (filters.minPrice) items = items.filter(x => x.price >= Number(filters.minPrice));
  if (filters.maxPrice) items = items.filter(x => x.price <= Number(filters.maxPrice));
  return items;
}

export function currencyFmt(value, code='MUR'){
  try { return new Intl.NumberFormat(undefined,{style:'currency',currency:code,maximumFractionDigits:0}).format(value); }
  catch{ return `${value} ${code}`; }
}

export function listingLink(id){ return `listing.html?id=${encodeURIComponent(id)}`; }

export function firstImage(listing){ return listing.images?.[0] || ''; }

export async function requireAuth() {
  return new Promise((resolve, reject) => {
    const unsub = auth.onAuthStateChanged(u => {
      unsub();
      if (u) resolve(u);
      else { alert('Please login first.'); window.location.href = './'; reject(); }
    });
  });
}
