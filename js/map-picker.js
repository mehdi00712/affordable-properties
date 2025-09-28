// js/map-picker.js
document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('pickMap');
  const lat = document.getElementById('lat');
  const lng = document.getElementById('lng');

  if (!mapEl || !lat || !lng) {
    console.warn('[map-picker] Skipped: map or lat/lng inputs not found on this page.');
    return;
  }

  // Defer 1 frame to ensure layout is ready before attaching Leaflet
  requestAnimationFrame(() => {
    try {
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
    } catch (e) {
      console.error('[map-picker] Leaflet init failed:', e);
    }
  });
});
