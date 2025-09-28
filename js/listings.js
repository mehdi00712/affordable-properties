import { getApprovedListings } from './app.js';
import { renderCards } from './render-helpers.js';

const grid = document.getElementById('listingsGrid');
const bigSearch = document.getElementById('bigSearch');
const qCity = document.getElementById('qCity');
function readMode(){ const sale = document.getElementById('sale'); return sale?.checked ? 'sale' : 'rent'; }

async function render(filters = {}) {
  const items = await getApprovedListings(filters);
  renderCards(items, grid);
}
bigSearch?.addEventListener('submit', (e)=>{
  e.preventDefault();
  render({ city: qCity.value.trim(), type: readMode() });
});
const params = new URLSearchParams(location.search);
const type = params.get('type');
const propertyType = params.get('propertyType');
render({
  type: (type==='rent'||type==='sale')?type:undefined,
  propertyType: propertyType || undefined
});
