// js/dashboard.js
import { requireAuth, currencyFmt, db } from './app.js';
import { uploadFilesToCloudinary, cloudinaryReady } from './cloudinary.js';
import {
  collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    console.error(err);
    const root = document.querySelector('main .wrap') || document.body;
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = `Could not load dashboard: ${err.message}`;
    root.appendChild(p);
  });
});

async function init(){
  const user = await requireAuth();

  // Elements (guard all)
  const form = document.getElementById('listingForm');
  const previewDiv = document.getElementById('preview');
  const filesInput = document.getElementById('imagesInput');
  const myListingsDiv = document.getElementById('myListings');
  const tpl = document.getElementById('myCardTpl');

  if (!form || !myListingsDiv){
    throw new Error('Dashboard form or containers not found. Are you on dashboard.html?');
  }

  console.info("Cloudinary configured:", cloudinaryReady());

  let selectedFiles = [];

  // Field refs
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

  function myCard(){
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

  // Files preview (safe binding)
  if (filesInput){
    filesInput.addEventListener('change', e=>{
      selectedFiles = Array.from(e.target.files || []);
      if (previewDiv) previewDiv.innerHTML = '';
      selectedFiles.forEach(f=>{
        if (!previewDiv) return;
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        previewDiv.appendChild(img);
      });
    });
  } else {
    console.warn('[dashboard] #imagesInput not found — skipping file preview binding.');
  }

  await loadMyListings();

  async function loadMyListings(){
    if (!myListingsDiv) return;
    myListingsDiv.innerHTML = '';
    try{
      const snap = await getDocs(query(collection(db,'listings'), where('ownerUid','==',user.uid)));
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      if (!docs.length){ myListingsDiv.innerHTML = '<p class="muted">No listings yet.</p>'; return; }

      for (const l of docs){
        const card = myCard();
        const imgEl = card.querySelector('.card-img');
        const titleEl = card.querySelector('.card-title');
        const metaEl = card.querySelector('.card-meta');
        const priceEl = card.querySelector('.card-price');
        const badgeEl = card.querySelector('.badge');
        const editBtn = card.querySelector('.actions .btn');
        const delBtn  = card.querySelector('.actions .delete');

        if (imgEl) imgEl.style.backgroundImage = `url('${(l.images&&l.images[0])||''}')`;
        if (titleEl) titleEl.textContent = l.title || '(untitled)';
        if (metaEl) metaEl.textContent = `${l.propertyType||'-'} • ${l.city||'-'}, ${l.country||'-'}`;
        if (priceEl) priceEl.textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / mo':'');
        if (badgeEl) badgeEl.textContent = `Status: ${l.status}`;

        editBtn && (editBtn.onclick = ()=> editListing(l));
        delBtn  && (delBtn.onclick  = ()=> deleteListing(l.id));

        myListingsDiv.appendChild(card);
      }
    }catch(err){
      console.error(err);
      myListingsDiv.innerHTML = `<p class="muted">Could not load your listings: ${err.message}</p>`;
    }
  }

  async function deleteListing(id){
    if (!confirm('Delete this listing?')) return;
    await deleteDoc(doc(db,'listings',id));
    loadMyListings();
  }

  function editListing(l){
    form.dataset.editing = l.id;
    if (titleInput)        titleInput.value        = l.title ?? '';
    if (typeInput)         typeInput.value         = l.type ?? '';
    if (propertyTypeInput) propertyTypeInput.value = l.propertyType ?? '';
    if (priceInput)        priceInput.value        = l.price ?? '';
    if (currencyInput)     currencyInput.value     = l.currency ?? 'MUR';
    if (bedroomsInput)     bedroomsInput.value     = l.bedrooms ?? '';
    if (bathroomsInput)    bathroomsInput.value    = l.bathrooms ?? '';
    if (sizeSqmInput)      sizeSqmInput.value      = l.sizeSqm ?? '';
    if (cityInput)         cityInput.value         = l.city ?? '';
    if (countryInput)      countryInput.value      = l.country ?? '';
    if (locationInput)     locationInput.value     = l.location ?? '';
    if (descriptionInput)  descriptionInput.value  = l.description ?? '';
    if (contactNameInput)  contactNameInput.value  = l.ownerContact?.name  ?? '';
    if (contactPhoneInput) contactPhoneInput.value = l.ownerContact?.phone ?? '';
    if (contactEmailInput) contactEmailInput.value = l.ownerContact?.email ?? '';
    if (latInput)          latInput.value          = l.locationLat ?? '';
    if (lngInput)          lngInput.value          = l.locationLng ?? '';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

    try{
      const data = {
        title: titleInput?.value.trim(),
        type: typeInput?.value,
        propertyType: propertyTypeInput?.value,
        price: Number(priceInput?.value),
        currency: currencyInput?.value,
        bedrooms: Number(bedroomsInput?.value || 0),
        bathrooms: Number(bathroomsInput?.value || 0),
        sizeSqm: Number(sizeSqmInput?.value || 0),
        city: cityInput?.value.trim(),
        country: countryInput?.value.trim(),
        location: locationInput?.value.trim(),
        description: descriptionInput?.value.trim(),
        ownerUid: user.uid,
        ownerContact: {
          name:  contactNameInput?.value.trim(),
          phone: contactPhoneInput?.value.trim(),
          email: contactEmailInput?.value.trim(),
        },
        locationLat: Number(latInput?.value),
        locationLng: Number(lngInput?.value),
        status: 'pending',
        updatedAt: serverTimestamp()
      };

      if (!data.title || !data.type || !data.propertyType || !data.city || !data.country || !data.price) {
        throw new Error('Please fill in all required fields.');
      }

      let uploaded = [];
      if (Array.isArray(selectedFiles) && selectedFiles.length){
        uploaded = await uploadFilesToCloudinary(selectedFiles);
      }

      if (form.dataset.editing) {
        const id = form.dataset.editing;
        if (uploaded.length) data.images = uploaded;
        await updateDoc(doc(db,'listings',id), data);
        form.dataset.editing = '';
        alert('Updated. Pending re-review by admin.');
      } else {
        data.images = uploaded;
        data.createdAt = serverTimestamp();
        await addDoc(collection(db,'listings'), data);
        alert('Submitted. Awaiting admin approval.');
      }

      form.reset();
      if (previewDiv) previewDiv.innerHTML = '';
      selectedFiles = [];
      await loadMyListings();

    } catch (err){
      console.error(err);
      alert(`Could not submit:\n${err.message}`);
    } finally {
      if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = 'Submit for approval'; }
    }
  });
}
