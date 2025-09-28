// js/dashboard.js — Post a property + "My listings" (robust)
import { requireAuth, currencyFmt, db } from './app.js';
import { uploadFilesToCloudinary, cloudinaryReady } from './cloudinary.js';
import {
  collection, query, where, getDocs, doc, getDoc,
  addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  start().catch(err => {
    console.error('[dashboard] boot failed:', err);
    showError(`Could not load dashboard: ${err.message}`);
  });
});

function showError(msg){
  const main = document.querySelector('main .wrap') || document.querySelector('main') || document.body;
  const div = document.createElement('div');
  div.className = 'alert error';
  div.textContent = msg;
  main.insertBefore(div, main.firstChild);
}

async function start(){
  const user = await requireAuth(); // redirects to index if not logged in

  // ===== DOM refs (these IDs must exist in dashboard.html) =====
  const form             = document.getElementById('listingForm');
  const myListingsDiv    = document.getElementById('myListings');
  const filesInput       = document.getElementById('imagesInput');
  const previewDiv       = document.getElementById('preview');
  const tpl              = document.getElementById('myCardTpl');

  // Fields
  const titleInput        = document.getElementById('title');
  const typeInput         = document.getElementById('type');
  const propertyTypeInput = document.getElementById('propertyType');
  const priceInput        = document.getElementById('price');
  const currencyInput     = document.getElementById('currency');
  const bedroomsInput     = document.getElementById('bedrooms');
  const bathroomsInput    = document.getElementById('bathrooms');
  const sizeSqmInput      = document.getElementById('sizeSqm');
  const cityInput         = document.getElementById('city');
  const countryInput      = document.getElementById('country');
  const locationInput     = document.getElementById('location');
  const descriptionInput  = document.getElementById('description');
  const contactNameInput  = document.getElementById('contactName');
  const contactPhoneInput = document.getElementById('contactPhone');
  const contactEmailInput = document.getElementById('contactEmail');
  const latInput          = document.getElementById('lat');
  const lngInput          = document.getElementById('lng');

  if (!form || !myListingsDiv) {
    throw new Error('Form or "my listings" container missing in dashboard.html');
  }

  // ===== images preview =====
  let selectedFiles = [];
  if (filesInput){
    filesInput.addEventListener('change', (e)=>{
      selectedFiles = Array.from(e.target.files || []);
      if (previewDiv) previewDiv.innerHTML = '';
      selectedFiles.forEach(f=>{
        if (!previewDiv) return;
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        previewDiv.appendChild(img);
      });
    });
  }

  // ===== render my listings =====
  await loadMyListings();

  async function loadMyListings(){
    myListingsDiv.innerHTML = '';
    try {
      const snap = await getDocs(query(collection(db,'listings'), where('ownerUid','==', user.uid)));
      const items = snap.docs.map(d=>({id:d.id, ...d.data()}))
        .sort((a,b)=>(b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));

      if (!items.length){
        myListingsDiv.innerHTML = '<p class="muted">No listings yet. Submit one below.</p>';
        return;
      }

      items.forEach(l=>{
        const card = cardEl();
        const imgEl   = card.querySelector('.card-img');
        const titleEl = card.querySelector('.card-title');
        const metaEl  = card.querySelector('.card-meta');
        const priceEl = card.querySelector('.card-price');
        const badgeEl = card.querySelector('.badge');
        const editBtn = card.querySelector('.actions .btn');
        const delBtn  = card.querySelector('.actions .delete');

        if (imgEl)   imgEl.style.backgroundImage = `url('${(l.images && l.images[0])||''}')`;
        if (titleEl) titleEl.textContent = l.title || '(untitled)';
        if (metaEl)  metaEl.textContent  = `${l.propertyType||'-'} • ${l.city||'-'}, ${l.country||'-'}`;
        if (priceEl) priceEl.textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / mo':'');
        if (badgeEl) badgeEl.textContent = `Status: ${l.status}`;

        editBtn && (editBtn.onclick = ()=> loadIntoForm(l));
        delBtn  && (delBtn.onclick  = ()=> removeListing(l.id));

        myListingsDiv.appendChild(card);
      });
    } catch (err){
      console.error('[dashboard] loadMyListings failed', err);
      myListingsDiv.innerHTML = `<p class="alert error">Could not load your listings: ${err.code || err.message}</p>`;
    }
  }

  function cardEl(){
    if (tpl && tpl.content && tpl.content.firstElementChild){
      return tpl.content.firstElementChild.cloneNode(true);
    }
    // fallback
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div class="card-img"></div>
      <div class="card-body">
        <h3 class="card-title"></h3>
        <p class="card-meta"></p>
        <p class="card-price"></p>
        <p class="badge"></p>
        <div class="actions">
          <button class="btn small" type="button">Edit</button>
          <button class="btn outline small delete" type="button">Delete</button>
        </div>
      </div>`;
    return el;
  }

  function loadIntoForm(l){
    form.dataset.editing = l.id;
    titleInput.value        = l.title ?? '';
    typeInput.value         = l.type ?? '';
    propertyTypeInput.value = l.propertyType ?? '';
    priceInput.value        = l.price ?? '';
    currencyInput.value     = l.currency ?? 'MUR';
    bedroomsInput.value     = l.bedrooms ?? '';
    bathroomsInput.value    = l.bathrooms ?? '';
    sizeSqmInput.value      = l.sizeSqm ?? '';
    cityInput.value         = l.city ?? '';
    countryInput.value      = l.country ?? '';
    locationInput.value     = l.location ?? '';
    descriptionInput.value  = l.description ?? '';
    contactNameInput.value  = l.ownerContact?.name  ?? '';
    contactPhoneInput.value = l.ownerContact?.phone ?? '';
    contactEmailInput.value = l.ownerContact?.email ?? '';
    latInput.value          = l.locationLat ?? '';
    lngInput.value          = l.locationLng ?? '';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function removeListing(id){
    if (!confirm('Delete this listing?')) return;
    try {
      await deleteDoc(doc(db,'listings',id));
      await loadMyListings();
      alert('Deleted.');
    } catch (err){
      console.error('[dashboard] delete failed', err);
      alert(`Delete failed: ${err.code || err.message}`);
    }
  }

  // ===== submit for approval =====
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn && (submitBtn.disabled = true, submitBtn.textContent = 'Submitting...');

    // collect + basic validate
    const data = {
      title: (titleInput.value || '').trim(),
      type: typeInput.value,
      propertyType: propertyTypeInput.value,
      price: Number(priceInput.value),
      currency: currencyInput.value || 'MUR',
      bedrooms: Number(bedroomsInput.value || 0),
      bathrooms: Number(bathroomsInput.value || 0),
      sizeSqm: Number(sizeSqmInput.value || 0),
      city: (cityInput.value || '').trim(),
      country: (countryInput.value || '').trim(),
      location: (locationInput.value || '').trim(),
      description: (descriptionInput.value || '').trim(),
      ownerUid: user.uid,
      ownerContact: {
        name:  (contactNameInput.value || '').trim(),
        phone: (contactPhoneInput.value || '').trim(),
        email: (contactEmailInput.value || '').trim(),
      },
      locationLat: Number(latInput.value),
      locationLng: Number(lngInput.value),
      status: 'pending',                     // 🔴 MUST be pending for rules + admin
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const missing = ['title','type','propertyType','price','city','country']
      .filter(k => !data[k]);
    if (missing.length){
      alert(`Please fill: ${missing.join(', ')}`);
      submitBtn && (submitBtn.disabled = false, submitBtn.textContent = 'Submit for approval');
      return;
    }

    // optional Cloudinary upload
    try {
      if (Array.isArray(selectedFiles) && selectedFiles.length && cloudinaryReady()){
        data.images = await uploadFilesToCloudinary(selectedFiles);
      } else {
        data.images = [];
      }
    } catch (uErr){
      console.warn('[dashboard] Cloudinary upload failed; saving without images:', uErr);
      data.images = [];
    }

    try {
      if (form.dataset.editing){
        const id = form.dataset.editing;
        await updateDoc(doc(db,'listings', id), data);
        form.dataset.editing = '';
        alert('Updated. Pending re-review.');
      } else {
        const ref = await addDoc(collection(db,'listings'), data);
        // re-read just for proof during debugging
        try {
          const snap = await getDoc(doc(db,'listings', ref.id));
          console.log('[dashboard] saved doc:', { id: snap.id, ...snap.data() });
        } catch {}
        alert('Submitted. Awaiting admin approval.');
      }
      form.reset();
      if (previewDiv) previewDiv.innerHTML = '';
      selectedFiles = [];
      await loadMyListings();
    } catch (err){
      console.error('[dashboard] save failed:', err);
      alert(`Could not submit: ${err.code || err.message}`);
    } finally {
      submitBtn && (submitBtn.disabled = false, submitBtn.textContent = 'Submit for approval');
    }
  });
}
