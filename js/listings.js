import { getApprovedListings, currencyFmt, listingLink, firstImage } from './app.js';

const grid = document.getElementById('listingsGrid');
const cardTpl = document.getElementById('cardTpl');
const form = document.getElementById('searchForm');

async function render(filters = {}) {
  grid.innerHTML = '';
  const items = await getApprovedListings(filters);
  if (!items.length) { grid.innerHTML = '<p style="padding:8px 16px">No results.</p>'; return; }
  for (const it of items) {
    const a = cardTpl.content.firstElementChild.cloneNode(true);
    a.href = listingLink(it.id);
    a.querySelector('.card-img').style.backgroundImage = `url('${firstImage(it)}')`;
    a.querySelector('.card-title').textContent = it.title;
    a.querySelector('.card-meta').textContent = `${it.propertyType} • ${it.city}, ${it.country} • ${it.bedrooms||0} bed • ${it.bathrooms||0} bath • ${it.sizeSqm||'-'} sqm`;
    a.querySelector('.card-price').textContent = currencyFmt(it.price, it.currency) + (it.type==='rent'?' / mo':'');
    grid.appendChild(a);
  }
}

form.addEventListener('submit', (e)=>{
  e.preventDefault();
  render({
    type: document.getElementById('filterType').value,
    propertyType: document.getElementById('filterPropertyType').value,
    city: document.getElementById('filterCity').value.trim(),
    minPrice: document.getElementById('minPrice').value,
    maxPrice: document.getElementById('maxPrice').value,
  });
});

render();
