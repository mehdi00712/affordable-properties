import { requireAuth, currencyFmt, db } from './app.js';
import { uploadFilesToCloudinary } from './cloudinary.js';
import {
  collection, query, where, orderBy, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const form = document.getElementById('listingForm');
const previewDiv = document.getElementById('preview');
const filesInput = document.getElementById('imagesInput');
const myListingsDiv = document.getElementById('myListings');
const tpl = document.getElementById('myCardTpl');

let currentUser;
let selectedFiles = [];

filesInput.addEventListener('change', (e)=>{
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
  loadMyListings();
})();

async function loadMyListings() {
  myListingsDiv.innerHTML = '';
  const snap = await getDocs(query(collection(db,'listings'), where('ownerUid','==',currentUser.uid), orderBy('createdAt','desc')));
  if (snap.empty) { myListingsDiv.innerHTML = '<p>No listings yet.</p>'; return; }
  for (const d of snap.docs) {
    const l = { id:d.id, ...d.data() };
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.querySelector('.card-img').style.backgroundImage = `url('${(l.images&&l.images[0])||''}')`;
    card.querySelector('.card-title').textContent = l.title;
    card.querySelector('.card-meta').textContent = `${l.propertyType} • ${l.city}, ${l.country}`;
    card.querySelector('.card-price').textContent = currencyFmt(l.price, l.currency) + (l.type==='rent'?' / mo':'');
    card.querySelector('.badge').textContent = `Status: ${l.status}`;
    card.querySelector('.edit').onclick = ()=> editListing(l);
    card.querySelector('.delete').onclick = ()=> deleteListing(l.id);
    myListingsDiv.appendChild(card);
  }
}

async function deleteListing(id){
  if (!confirm('Delete this listing?')) return;
  await deleteDoc(doc(db,'listings',id));
  loadMyListings();
}

function editListing(l){
  form.dataset.editing = l.id;
  document.getElementById('title').value = l.title;
  document.getElementById('type').value = l.type;
  document.getElementById('propertyType').value = l.propertyType;
  document.getElementById('price').value = l.price;
  document.getElementById('currency').value = l.currency;
  document.getElementById('bedrooms').value = l.bedrooms || '';
  document.getElementById('bathrooms').value = l.bathrooms || '';
  document.getElementById('sizeSqm').value = l.sizeSqm || '';
  document.getElementById('city').value = l.city;
  document.getElementById('country').value = l.country;
  document.getElementById('location').value = l.location || '';
  document.getElementById('description').value = l.description;
  document.getElementById('contactName').value = l.ownerContact?.name || '';
  document.getElementById('contactPhone').value = l.ownerContact?.phone || '';
  document.getElementById('contactEmail').value = l.ownerContact?.email || '';
  window.scrollTo({top:0,behavior:'smooth'});
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();

  const data = {
    title: document.getElementById('title').value.trim(),
    type: document.getElementById('type').value,
    propertyType: document.getElementById('propertyType').value,
    price: Number(document.getElementById('price').value),
    currency: document.getElementById('currency').value,
    bedrooms: Number(document.getElementById('bedrooms').value || 0),
    bathrooms: Number(document.getElementById('bathrooms').value || 0),
    sizeSqm: Number(document.getElementById('sizeSqm').value || 0),
    city: document.getElementById('city').value.trim(),
    country: document.getElementById('country').value.trim(),
    location: document.getElementById('location').value.trim(),
    description: document.getElementById('description').value.trim(),
    ownerUid: currentUser.uid,
    ownerContact: {
      name: document.getElementById('contactName').value.trim(),
      phone: document.getElementById('contactPhone').value.trim(),
      email: document.getElementById('contactEmail').value.trim(),
    },
    status: 'pending',
    updatedAt: serverTimestamp(),
  };

  // Upload new images if selected
  let uploaded = [];
  if (selectedFiles.length) {
    try { uploaded = await uploadFilesToCloudinary(selectedFiles); }
    catch (e) { alert('Image upload failed: ' + e.message); return; }
  }

  if (form.dataset.editing) {
    const id = form.dataset.editing;
    if (uploaded.length) data.images = uploaded;
    await updateDoc(doc(db,'listings',id), data);
    form.dataset.editing = '';
    alert('Updated. Pending re-review.');
  } else {
    data.images = uploaded;
    data.createdAt = serverTimestamp();
    await addDoc(collection(db,'listings'), data);
    alert('Submitted. An admin will approve it soon.');
  }

  form.reset();
  previewDiv.innerHTML = '';
  selectedFiles = [];
  loadMyListings();
});
