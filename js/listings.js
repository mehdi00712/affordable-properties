import { getApprovedListings, listingLink, firstImage, currencyFmt } from './app.js';

const grid = document.getElementById('listingsGrid');
const tpl = document.getElementById('cardTpl');

// Hero quick search
const bigSearch = document.getElementById('bigSearch');
const qCity = document.getElementById('qCity');

function readMode(){ const sale = document.getElementById('sale'); return sale?.checked ? 'sale' : 'rent'; }

async function render(filters = {}) {
  grid.innerHTML = '';
  const items = await getApprovedListings(filters);
  if (!items.length){ grid.innerHTML = '<p class="muted" style="padding:8px 16px">No results.</p>'; return; }
  for (const it of items){
    const a = tpl.content.firstElementChild.cloneNode(true);
    a.href = listingLink(it.id);
    a.querySelector('.card-img').style.backgroundImage = `url('${firstImage(it)}')`;
    a.querySelector('.card-title').textContent = it.title;
    a.querySelector('.card-meta').textContent = `${it.propertyType} • ${it.city}, ${it.country} • ${it.bedrooms||0} bed • ${it.bathrooms||0} bath • ${it.sizeSqm||'-'} sqm`;
    a.querySelector('.card-price').textContent = currencyFmt(it.price, it.currency) + (it.type==='rent'?' / mo':'');
    grid.appendChild(a);
  }
}

bigSearch?.addEventListener('submit', (e)=>{
  e.preventDefault();
  render({ city: qCity.value.trim(), type: readMode() });
});

// Querystring support (?type=sale)
const params = new URLSearchParams(location.search);
const type = params.get('type');
render({ type: (type==='rent' || type==='sale') ? type : undefined });
