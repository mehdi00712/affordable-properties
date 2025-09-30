const openBtn  = document.getElementById('btn-pick-location');
const modal    = document.getElementById('mapPickModal');
const closeBtn = document.getElementById('closePick');
const saveBtn  = document.getElementById('savePick');
const clearBtn = document.getElementById('clearPick');
const latInp   = document.getElementById('lat');
const lngInp   = document.getElementById('lng');
const label    = document.getElementById('pickedLatLng');

let map, marker;

function open(){ modal.classList.remove('hide'); setTimeout(init,0); }
function close(){ modal.classList.add('hide'); }
openBtn?.addEventListener('click', open);
closeBtn?.addEventListener('click', close);

function init(){
  if (!map){
    map = L.map('pickMap').setView([-20.16, 57.5], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap' }).addTo(map);
    map.on('click', (e)=>{
      const { lat, lng } = e.latlng;
      if (!marker) marker = L.marker(e.latlng).addTo(map);
      else marker.setLatLng(e.latlng);
    });
  }
  map.invalidateSize();
  if (latInp.value && lngInp.value){
    const lat = Number(latInp.value), lng = Number(lngInp.value);
    if (!marker) marker = L.marker([lat,lng]).addTo(map);
    else marker.setLatLng([lat,lng]);
    map.setView([lat,lng], 14);
  }
}

saveBtn?.addEventListener('click', ()=>{
  if (!marker){ alert('Click on the map to choose a location.'); return; }
  const { lat, lng } = marker.getLatLng();
  latInp.value = lat.toFixed(6);
  lngInp.value = lng.toFixed(6);
  label.textContent = `Selected: ${latInp.value}, ${lngInp.value}`;
  close();
});
clearBtn?.addEventListener('click', ()=>{
  latInp.value = ''; lngInp.value = '';
  label.textContent = 'No location selected';
  if (marker){ map.removeLayer(marker); marker = null; }
});
