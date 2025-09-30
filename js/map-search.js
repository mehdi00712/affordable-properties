import { getApprovedListings, firstImage, listingLink, currencyFmt } from './app.js';

const openBtn   = document.getElementById('btn-draw-search');
const modal     = document.getElementById('mapDrawModal');
const closeBtn  = document.getElementById('closeDraw');
const applyBtn  = document.getElementById('applyPolygon');
const clearBtn  = document.getElementById('clearPolygon');
const grid      = document.getElementById('listingsGrid');
const tpl       = document.getElementById('cardTpl');

let map, drawControl, featureGroup, currentPolygon = null;
let allItems = [];

function openModal(){ modal.classList.remove('hide'); setTimeout(initMap, 0); }
function closeModal(){ modal.classList.add('hide'); }

openBtn?.addEventListener('click', openModal);
closeBtn?.addEventListener('click', closeModal);

function initMap(){
  if (map) { map.invalidateSize(); return; }
  map = L.map('drawMap', { zoomControl: true }).setView([-20.16, 57.5], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap' }).addTo(map);

  featureGroup = new L.FeatureGroup();
  map.addLayer(featureGroup);

  // style to theme color
  L.Draw.Polygon.prototype.options.shapeOptions = {
    color: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#00b0ff',
    weight: 2, opacity: 0.9, fillOpacity: 0.1
  };

  drawControl = new L.Control.Draw({
    draw: { polygon: { allowIntersection:false, showArea:true }, polyline:false, rectangle:false, circle:false, marker:false, circlemarker:false },
    edit: { featureGroup }
  });
  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, (e)=>{
    featureGroup.clearLayers();
    currentPolygon = e.layer;
    featureGroup.addLayer(currentPolygon);
  });
  map.on(L.Draw.Event.EDITED, (e)=>{
    currentPolygon = null; e.layers.eachLayer(l=> currentPolygon = l);
  });
  map.on(L.Draw.Event.DELETED, ()=> currentPolygon = null);
}

function pointInPolygon(lat, lng, polyLatLngs){
  const x = lng, y = lat; let inside = false;
  for (let i=0, j=polyLatLngs.length-1; i<polyLatLngs.length; j=i++){
    const xi = polyLatLngs[i].lng, yi = polyLatLngs[i].lat;
    const xj = polyLatLngs[j].lng, yj = polyLatLngs[j].lat;
    const intersect = ((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

async function ensureItems(){
  if (allItems.length) return allItems;
  allItems = await getApprovedListings();
  return allItems;
}

function render(items){
  grid.innerHTML = '';
  if (!items.length){ grid.innerHTML = '<p class="muted" style="padding:8px 16px">No results for this area.</p>'; return; }
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

applyBtn?.addEventListener('click', async ()=>{
  await ensureItems();
  if (!currentPolygon){ alert('Draw a polygon first.'); return; }
  const latlngs = currentPolygon.getLatLngs()[0];
  const filtered = allItems.filter(it=>{
    if (typeof it.lat !== 'number' || typeof it.lng !== 'number') return false;
    return pointInPolygon(it.lat, it.lng, latlngs);
  });
  render(filtered);
  closeModal();
});

clearBtn?.addEventListener('click', async ()=>{
  featureGroup?.clearLayers(); currentPolygon = null;
  await ensureItems(); render(allItems);
  closeModal();
});
