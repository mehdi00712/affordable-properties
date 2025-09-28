import { getApprovedListings } from './app.js';
import { renderCards } from './render-helpers.js';

const mapModal = document.getElementById('mapModal');
const openBtn = document.getElementById('btn-draw');
const closeBtn = document.getElementById('closeMap');
const applyBtn = document.getElementById('btn-apply-shape');
const clearBtn = document.getElementById('btn-clear-shape');
const listingsGrid = document.getElementById('listingsGrid');
const qCity = document.getElementById('qCity');
const sale = document.getElementById('sale');

let map, drawnItems, polygonLatLngs = null;

function open(){ mapModal.classList.remove('hide'); setTimeout(initMap,0); }
function close(){ mapModal.classList.add('hide'); }
openBtn?.addEventListener('click', open);
closeBtn?.addEventListener('click', close);
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });

function initMap(){
  if (map) return;
  map = L.map('mapSearch', { zoomControl:true, preferCanvas:true }).setView([ -20.1653, 57.5012 ], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap' }).addTo(map);

  drawnItems = new L.FeatureGroup(); map.addLayer(drawnItems);

  const drawCtrl = new L.Control.Draw({
    position: 'topleft',
    draw: { polygon: { showArea:true, shapeOptions:{ color:'#0076c9' } }, rectangle:false, circle:false, marker:false, circlemarker:false, polyline:false },
    edit: { featureGroup: drawnItems, remove: true }
  });
  map.addControl(drawCtrl);

  map.on(L.Draw.Event.CREATED, (e)=>{
    drawnItems.clearLayers();
    drawnItems.addLayer(e.layer);
    polygonLatLngs = e.layer.getLatLngs()[0].map(p => [p.lat, p.lng]);
  });
  map.on(L.Draw.Event.EDITED, ()=>{
    const layer = drawnItems.getLayers()[0];
    if (layer) polygonLatLngs = layer.getLatLngs()[0].map(p => [p.lat, p.lng]);
  });
  map.on(L.Draw.Event.DELETED, ()=>{ polygonLatLngs = null; });
}

clearBtn?.addEventListener('click', ()=>{ drawnItems?.clearLayers(); polygonLatLngs=null; });

applyBtn?.addEventListener('click', async ()=>{
  const type = sale?.checked ? 'sale' : 'rent';
  let items = await getApprovedListings({ type, city: qCity?.value.trim() || undefined });
  if (polygonLatLngs) items = items.filter(pt => insidePolygon([pt.locationLat, pt.locationLng], polygonLatLngs));
  renderCards(items, listingsGrid);
  close();
});

// Ray casting
function insidePolygon(point, vs){
  if (!point || point.some(x=>typeof x!=='number')) return false;
  let x = point[1], y = point[0], inside = false;
  for (let i=0, j=vs.length-1; i<vs.length; j=i++){
    const xi = vs[i][1], yi = vs[i][0];
    const xj = vs[j][1], yj = vs[j][0];
    const intersect = ((yi>y)!==(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi+0.0000001)+xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
