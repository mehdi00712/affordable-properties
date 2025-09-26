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

let currentUser; let selectedFiles=[];

filesInput.addEventListener('change', e=>{
  selectedFiles = Array.from(e.target.files||[]);
  previewDiv.innerHTML=''; selectedFiles.forEach(f=>{ const img=document.createElement('img'); img.src=URL.createObjectURL(f); previewDiv.appendChild(img); });
});

(async function init(){ currentUser = await requireAuth(); loadMyListings(); })();

async function loadMyListings(){
  myListingsDiv.innerHTML='';
  const snap = await getDocs(query(collection(db,'listings'), where('ownerUid','==',currentUser.uid), orderBy('createdAt','desc')));
  if (snap.empty){ myListingsDiv.innerHTML='<p class="muted">No listings yet.</p>'; return; }
  for (const d of snap.docs){
    const l = {id:d.id,...d.data()};
    const card = tpl.content.firstElementChild.cloneNode(true);
    card.querySelector('.card-img').style.backgroundImage = `url('${(l.images&&l.images[0])||''}')`;
    card.querySelector('.card-title').textContent = l.title;
    card.querySelector('.card-meta').textContent = `${l.propertyType} • ${l.city}, ${l.country}`;
    card.querySelector('.card-price').textContent = currencyFmt(l.price,l.currency) + (l.type==='rent'?' / mo':'');
    card.querySelector('.badge').textContent = `Status: ${l.status}`;
    card.querySelector('.actions .btn').onclick = ()=> editListing(l);
    card.querySelector('.actions .delete').onclick = ()=> deleteListing(l.id);
    myListingsDiv.appendChild(card);
  }
}
async function deleteListing(id){ if(!confirm('Delete this listing?'))return; await deleteDoc(doc(db,'listings',id)); loadMyListings(); }

function editListing(l){
  form.dataset.editing=l.id;
  ['title','type','propertyType','price','currency','bedrooms','bathrooms','sizeSqm','city','country','location','description'].forEach(k=>{
    const el=document.getElementById(k); if (el) el.value = l[k] ?? '';
  });
  document.getElementById('contactName').value = l.ownerContact?.name||'';
  document.getElementById('contactPhone').value = l.ownerContact?.phone||'';
  document.getElementById('contactEmail').value = l.ownerContact?.email||'';
  window.scrollTo({top:0,behavior:'smooth'});
}

form.addEventListener('submit', async e=>{
  e.preventDefault();
  const data = {
    title: title.value.trim(),
    type: type.value, propertyType: propertyType.value,
    price: Number(price.value), currency: currency.value,
    bedrooms: Number(bedrooms.value||0), bathrooms: Number(bathrooms.value||0), sizeSqm: Number(sizeSqm.value||0),
    city: city.value.trim(), country: country.value.trim(), location: location.value.trim(),
    description: description.value.trim(),
    ownerUid: currentUser.uid,
    ownerContact: { name: contactName.value.trim(), phone: contactPhone.value.trim(), email: contactEmail.value.trim() },
    status: 'pending', updatedAt: serverTimestamp()
  };
  let uploaded=[]; if (selectedFiles.length){ try{ uploaded=await uploadFilesToCloudinary(selectedFiles);}catch(e){ alert('Image upload failed: '+e.message); return;} }

  if (form.dataset.editing){
    const id=form.dataset.editing; if (uploaded.length) data.images=uploaded;
    await updateDoc(doc(db,'listings',id), data);
    form.dataset.editing=''; alert('Updated. Pending re-review.');
  }else{
    data.images=uploaded; data.createdAt=serverTimestamp();
    await addDoc(collection(db,'listings'), data);
    alert('Submitted. Awaiting approval.');
  }
  form.reset(); previewDiv.innerHTML=''; selectedFiles=[]; loadMyListings();
});
