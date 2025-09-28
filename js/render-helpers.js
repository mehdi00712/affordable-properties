import { listingLink, firstImage, currencyFmt } from './app.js';

export function renderCards(items, grid){
  grid.innerHTML = '';
  const tpl = document.getElementById('cardTpl');
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
