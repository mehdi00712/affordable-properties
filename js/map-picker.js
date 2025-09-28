// js/map-picker.js
document.addEventListener('DOMContentLoaded', () => {
  const lat = document.getElementById('lat');
  const lng = document.getElementById('lng');
  const mapEl = document.getElementById('pickMap');

  // If this page doesn't have a map, just exit cleanly.
  if (!mapEl || !lat || !lng) return;

  // Leaflet is loaded globally from the script tag in dashboard.html
  const map = L.map('pickMap', { zoomControl:true }).setView([-20.1653,57.5012], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap' }).addTo(map);

  let marker = L.marker(map.getCenter(), { draggable:true }).addTo(map);
  function syncInputsFromMarker(){
    const p = marker.getLatLng(); lat.value = p.lat.toFixed(6); lng.value = p.lng.toFixed(6);
  }
  marker.on('dragend', syncInputsFromMarker);
  syncInputsFromMarker();

  [lat,lng].forEach(inp => inp.addEventListener('change', ()=>{
    const la = parseFloat(lat.value), ln = parseFloat(lng.value);
    if (Number.isFinite(la) && Number.isFinite(ln)){ marker.setLatLng([la,ln]); map.panTo([la,ln]); }
  }));
});
