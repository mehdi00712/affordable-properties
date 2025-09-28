// js/dashboard.js (diagnostic)
import { requireAuth, currencyFmt, db } from './app.js';
import { uploadFilesToCloudinary, cloudinaryReady } from './cloudinary.js';
import {
  collection, query, where, getDocs, doc, getDoc,
  addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  init().catch(err => {
    console.error('[dashboard:init] fatal', err);
    appendError(`Could not load dashboard: ${err.message}`);
  });
});

function ensureDebugBox() {
  let box = document.getElementById('dash-debug');
  if (!box) {
    box = document.createElement('div');
    box.id = 'dash-debug';
    box.className = 'panel';
    box.style.cssText = 'margin:12px 0;padding:12px;border:1px solid #eee;border-radius:10px';
    const main = document.querySelector('main .wrap') || document.querySelector('main') || document.body;
    main.insertBefore(box, main.firstChild);
  }
  return box;
}
function setDebug(html) { ensureDebugBox().innerHTML = html; }
function appendError(msg) {
  const box = ensureDebugBox();
  const p = document.createElement('div');
  p.className = 'alert error';
  p.textContent = msg;
  box.appendChild(p);
}

async function init(){
  const user = await requireAuth();

  // Elements
  const form = document.getElementById('listingForm');
  const previewDiv = document.getElementById('preview');
  const filesInput = document.getElementById('imagesInput');
  const myListingsDiv = document.getElementById('myListings');
  const tpl = document.getElementById('myCardTpl');

  if (!form || !myListingsDiv){
    throw new Error('Dashboard form or containers not found. Are you on dashboard.html?');
  }

  // Debug banner
  setDebug(`
    <strong>Dashboard debug</strong><br/>
    Signed in as: <code>${user.email || '(no email)'}</code><br/>
    UID: <code>${user.uid}</code><br/>
    Cloudinary configured: <code>${cloudinaryReady()}</code>
  `);

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

  // Files preview
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
  }

  await loadMyListings();

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

  async function loadMyListings(){
    myListingsDiv.innerHTML = '';
    try{
      const snap = await getDocs(query(collection(db,'listings'), where('ownerUid','==',user.uid)));
      let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a,b)=> (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      const count = docs.length;

      const hdr = document.createElement('div');
      hdr.className = 'muted';
      hdr.style.margin = '8px 0';
      hdr.textContent = `Your listings found: ${count}`;
      myListingsDiv.appendChild(hdr);

      if (!docs.length){
        const p = document.createElement('p');
        p.className = 'muted';
        p.textContent = 'No listings yet. Submit one below.';
        myListingsDiv.appendChild(p);
        return;
      }

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
      console.error('[dashboard] loadMyListings failed', err);
      myListingsDiv.innerHTML = `<p class="alert error">Could not load your listings: ${err.code || err.message}</p>`;
    }
  }

  async function deleteListing(id){
    if (!confirm('Delete this listing?')) return;
    try{
      await deleteDoc(doc(db,'listings',id));
      await loadMyListings();
      alert('Deleted.');
    }catch(err){
      console.error('[dashboard] delete failed', err);
      alert(`Delete failed: ${err.code || err.message}`);
    }
  }

  function editListing(l){
    form.dataset.editing = l.id;
    titleInput        && (titleInput.value        = l.title ?? '');
    typeInput         && (typeInput.value         = l.type ?? '');
    propertyTypeInput && (propertyTypeInput.value = l.propertyType ?? '');
    priceInput        && (priceInput.value        = l.price ?? '');
    currencyInput     && (currencyInput.value     = l.currency ?? 'MUR');
    bedroomsInput     && (bedroomsInput.value     = l.bedrooms ?? '');
    bathroomsInput    && (bathroomsInput.value    = l.bathrooms ?? '');
    sizeSqmInput      && (sizeSqmInput.value      = l.sizeSqm ?? '');
    cityInput         && (cityInput.value         = l.city ?? '');
    countryInput      && (countryInput.value      = l.country ?? '');
    locationInput     && (locationInput.value     = l.location ?? '');
    descriptionInput  && (descriptionInput.value  = l.description ?? '');
    contactNameInput  && (contactNameInput.value  = l.ownerContact?.name  ?? '');
    contactPhoneInput && (contactPhoneInput.value = l.ownerContact?.phone ?? '');
    contactEmailInput && (contactEmailInput.value = l.ownerContact?.email ?? '');
    latInput          && (latInput.value          = l.locationLat ?? '');
    lngInput          && (lngInput.value          = l.locationLng ?? '');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn && (submitBtn.disabled = true, submitBtn.textContent = 'Submitting…');

    // Build data
    const data = {
      title: titleInput?.value.trim(),
      type: typeInput?.value,
      propertyType: propertyTypeInput?.value,
      price: Number(priceInput?.value),
      currency: currencyInput?.value || 'MUR',
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
      status: 'pending',                // IMPORTANT for rules
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // quick client validation
    const required = ['title','type','propertyType','price','city','country'];
    const missing = required.filter(k => !data[k]);
    if (missing.length){
      alert(`Please fill in: ${missing.join(', ')}`);
      submitBtn && (submitBtn.disabled = false, submitBtn.textContent = 'Submit for approval');
      return;
    }

    try{
      // Upload images (if any)
      let uploaded = [];
      if (Array.isArray(selectedFiles) && selectedFiles.length){
        uploaded = await uploadFilesToCloudinary(selectedFiles);
      }
      data.images = uploaded;

      let savedId;
      if (form.dataset.editing){
        // Update existing (status remains same)
        savedId = form.dataset.editing;
        await updateDoc(doc(db,'listings',savedId), data);
        alert('Updated. Pending re-review by admin.');
      } else {
        // Create new
        const ref = await addDoc(collection(db,'listings'), data);
        savedId = ref.id;
        alert(`Submitted for approval. New ID: ${savedId}`);
      }

      console.log('[dashboard] saved doc id:', savedId);

      // Re-read the doc to prove it was written (or to show rules error)
      try {
        const snap = await getDoc(doc(db,'listings', savedId));
        console.log('[dashboard] re-read doc:', { id: snap.id, ...snap.data() });
        const dbg = ensureDebugBox();
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.textContent = `Saved doc: ${savedId}\n` + JSON.stringify({ id: snap.id, ...snap.data() }, null, 2);
        dbg.appendChild(pre);
      } catch (reErr) {
        console.error('[dashboard] re-read failed', reErr);
        appendError(`Re-read failed (rules?): ${reErr.code || reErr.message}`);
      }

      // Reset form & reload list
      form.reset();
      if (previewDiv) previewDiv.innerHTML = '';
      selectedFiles = [];
      form.dataset.editing = '';
      await loadMyListings();

    } catch (err){
      console.error('[dashboard] submit failed', err);
      // Most common cause: rules rejection (permission-denied)
      appendError(`Submit failed: ${err.code || err.message}`);
      alert(`Could not submit:\n${err.code || err.message}`);
    } finally {
      submitBtn && (submitBtn.disabled = false, submitBtn.textContent = 'Submit for approval');
    }
  });
}
