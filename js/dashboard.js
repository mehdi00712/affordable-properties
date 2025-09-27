// js/dashboard.js
import { requireAuth, currencyFmt, db } from './app.js';
import { uploadFilesToCloudinary, cloudinaryReady } from './cloudinary.js';
import {
  collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const form = document.getElementById('listingForm');
const previewDiv = document.getElementById('preview');
const filesInput = document.getElementById('imagesInput');
const myListingsDiv = document.getElementById('myListings');
const tpl = document.getElementById('myCardTpl');

console.info("Cloudinary configured:", cloudinaryReady());

let currentUser; 
let selectedFiles = [];

// Grab inputs explicitly (IDs don't become globals in modules)
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

filesInput.addEventListener('change', e=>{
  selectedFiles = Array.from(e.target.files || []);
  previewDiv.innerHTML = '';
  selectedFiles.forEach(f=>{
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    previewDiv.appendChild(img);
  });
});

(async function init(){
  currentUser = await requireAuth();
  await loadMyListings();
})();

async function loadMyListings(){
  myListingsDiv.innerHTML = '';
  try{
    // No orderBy -> no composite index needed; sort client-side
    const snap = await getDocs(query(
      collection(db,'listings'),
      where('ownerUid','==',currentUser.uid)
    ));
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a,b)=>{
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta; // newest first
    });

    if (!docs.length){ myListingsDiv.innerHTML = '<p class="muted">No listings yet.</p>'; return; }

    for (const l of docs){
      const card = tpl.content.firstElementChild.cloneNode(true);
      card.querySelector('.card-img').style.backgroundImage = `url('${(l.images&&l.images[0])||''}')`;
      card.querySelector('.card-title').textContent = l.title;
      card.querySelector('.card-meta').textContent = `${l.propertyType} • ${l.city}, ${l.country}`;
      card.querySelector('.card-price').textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / mo':'');
      card.querySelector('.badge').textContent = `Status: ${l.status}`;
      card.querySelector('.actions .btn').onclick = ()=> editListing(l);
      card.querySelector('.actions .delete').onclick = ()=> deleteListing(l.id);
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
  window.scrollTo({top:0,behavior:'smooth'});
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true; submitBtn.textContent = 'Submitting...';

  try{
    const data = {
      title: titleInput.value.trim(),
      type: typeInput.value,
      propertyType: propertyTypeInput.value,
      price: Number(priceInput.value),
      currency: currencyInput.value,
      bedrooms: Number(bedroomsInput.value || 0),
      bathrooms: Number(bathroomsInput.value || 0),
      sizeSqm: Number(sizeSqmInput.value || 0),
      city: cityInput.value.trim(),
      country: countryInput.value.trim(),
      location: locationInput.value.trim(),
      description: descriptionInput.value.trim(),
      ownerUid: currentUser.uid,
      ownerContact: {
        name:  contactNameInput.value.trim(),
        phone: contactPhoneInput.value.trim(),
        email: contactEmailInput.value.trim(),
      },
      status: 'pending',
      updatedAt: serverTimestamp()
    };

    if (!data.title || !data.type || !data.propertyType || !data.city || !data.country || !data.price) {
      throw new Error('Please fill in all required fields.');
    }

    // Upload images (optional)
    let uploaded = [];
    if (selectedFiles.length){
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
    previewDiv.innerHTML = '';
    selectedFiles = [];
    await loadMyListings();

  } catch (err){
    console.error(err);
    alert(`Could not submit:\n${err.message}`);
  } finally {
    submitBtn.disabled = false; submitBtn.textContent = 'Submit for approval';
  }
});
