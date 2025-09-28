// js/dashboard.js
import { requireAuth, currencyFmt, db } from './app.js';
import {
  collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => start());

async function start(){
  const user = await requireAuth();

  const form = document.getElementById('listingForm');
  const myListingsDiv = document.getElementById('myListings');
  const tpl = document.getElementById('myCardTpl');
  if (!form || !myListingsDiv){ alert('dashboard.html missing required elements'); return; }

  await loadMyListings();

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn && (btn.disabled = true, btn.textContent = 'Submitting…');

    const v = id => (document.getElementById(id)?.value || '').trim();
    const data = {
      title: v('title'),
      type: v('type'),
      propertyType: v('propertyType'),
      price: Number(v('price')),
      currency: v('currency') || 'MUR',
      bedrooms: Number(v('bedrooms') || 0),
      bathrooms: Number(v('bathrooms') || 0),
      sizeSqm: Number(v('sizeSqm') || 0),
      city: v('city'),
      country: v('country'),
      location: v('location'),
      description: v('description'),
      ownerUid: user.uid,
      ownerContact: { name: v('contactName'), phone: v('contactPhone'), email: v('contactEmail') },
      locationLat: Number(v('lat')),
      locationLng: Number(v('lng')),
      images: [],
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const required = ['title','type','propertyType','price','city','country'];
    const missing = required.filter(k => !data[k]);
    if (missing.length){ alert('Please fill: ' + missing.join(', ')); btn && (btn.disabled=false, btn.textContent='Submit for approval'); return; }

    try {
      if (form.dataset.editing){
        await updateDoc(doc(db,'listings', form.dataset.editing), data);
        form.dataset.editing = '';
        alert('Updated. Pending re-review.');
      } else {
        const ref = await addDoc(collection(db,'listings'), data);
        alert('Submitted. Awaiting admin approval. id='+ref.id);
      }
      form.reset();
      await loadMyListings();
    } catch (err){
      console.error('[dashboard] write failed', err);
      alert('Could not submit: ' + (err.code || err.message));
    } finally {
      btn && (btn.disabled=false, btn.textContent='Submit for approval');
    }
  });

  async function loadMyListings(){
    myListingsDiv.innerHTML = '';
    try{
      const snap = await getDocs(query(collection(db,'listings'), where('ownerUid','==', user.uid)));
      const items = snap.docs.map(d=>({id:d.id, ...d.data()}))
        .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

      if (!items.length){ myListingsDiv.innerHTML = '<p class="muted">No listings yet.</p>'; return; }

      for (const l of items){
        const el = tpl?.content?.firstElementChild?.cloneNode(true) ?? simpleCard();
        const img   = el.querySelector('.card-img');
        const title = el.querySelector('.card-title');
        const meta  = el.querySelector('.card-meta');
        const price = el.querySelector('.card-price');
        const badge = el.querySelector('.badge');

        if (img)   img.style.backgroundImage = `url('${(l.images && l.images[0]) || ''}')`;
        if (title) title.textContent = l.title || '(untitled)';
        if (meta)  meta.textContent  = `${l.propertyType||'-'} • ${l.city||'-'}, ${l.country||'-'}`;
        if (price) price.textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / mo':'');
        if (badge) badge.textContent = `Status: ${l.status}`;

        myListingsDiv.appendChild(el);
      }
    }catch(err){
      console.error('[dashboard] loadMyListings failed', err);
      myListingsDiv.innerHTML = `<p class="alert error">Cannot load your listings: ${err.code || err.message}</p>`;
    }
  }

  function simpleCard(){
    const d = document.createElement('div');
    d.className = 'card';
    d.innerHTML = `
      <div class="card-body">
        <h3 class="card-title"></h3>
        <p class="card-meta"></p>
        <p class="card-price"></p>
        <p class="badge"></p>
      </div>`;
    return d;
  }
}
