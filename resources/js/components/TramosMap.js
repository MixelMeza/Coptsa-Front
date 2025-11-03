import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Small toast helper for user feedback
function _showToast(msg, timeout = 2800) {
  try {
    let t = document.getElementById('__tramos_toast');
    if (!t) {
      t = document.createElement('div');
      t.id = '__tramos_toast';
      t.style.position = 'fixed';
      t.style.right = '20px';
      t.style.bottom = '20px';
      t.style.zIndex = '10000';
      document.body.appendChild(t);
    }
    const el = document.createElement('div');
    el.style.background = 'rgba(0,0,0,0.8)';
    el.style.color = '#fff';
    el.style.padding = '8px 12px';
    el.style.marginTop = '8px';
    el.style.borderRadius = '6px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.24)';
    el.style.fontSize = '13px';
    el.innerText = msg;
    t.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 260ms ease, transform 260ms ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => el.remove(), 300);
    }, timeout);
  } catch (e) { /* no-op */ }
}
// --- Estructura y lógica de trazos ---
// Expose both names for compatibility: `trazos` and `tramos`
export const trazos = [];
export const tramos = trazos;

// --- Persistencia local de trazos ---
function guardarTrazosLS() {
  try {
    localStorage.setItem('trazos', JSON.stringify(trazos));
  } catch(e) {}
}
function cargarTrazosLS() {
  try {
    const data = localStorage.getItem('trazos');
    if (data) {
      const arr = JSON.parse(data);
      trazos.length = 0;
      arr.forEach(t => trazos.push(t));
    }
  } catch(e) {}
}
cargarTrazosLS();

export function distanciaEntre(a, b) {
  // Haversine
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const aVal = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1-aVal));
}
export function calcularDistancia(puntos) {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    total += distanciaEntre(puntos[i-1], puntos[i]);
  }
  return +(total/1000).toFixed(2); // km
}

// --- Modal HTML ---
const modalHtml = `
<style>
#modal-trazo-bg {
  position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.18);z-index:9998;
}
#modal-trazo {
  position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
  background:#fff;padding:24px 20px;border-radius:10px;box-shadow:0 8px 32px #0002;z-index:9999;
  min-width:320px;max-width:90vw;
}
#modal-trazo label {display:block;margin-top:12px;font-weight:500;}
#modal-trazo input[type="text"], #modal-trazo input[type="number"], #modal-trazo input[type="color"] {
  width:100%;padding:7px 10px;margin-top:4px;border-radius:5px;border:1px solid #e0e0e0;font-size:15px;
}
#modal-trazo input[readonly] {background:#f7f7fa;}
#modal-trazo .modal-actions {margin-top:18px;display:flex;gap:12px;}
#modal-trazo button {padding:8px 18px;border:none;border-radius:6px;font-size:15px;cursor:pointer;}
#modal-trazo .btn-save {background:#2563eb;color:#fff;}
#modal-trazo .btn-cancel {background:#ef4444;color:#fff;}
</style>
<div id="modal-trazo-bg"></div>
<div id="modal-trazo">
  <form id="form-trazo">
    <label>Nombre del trazo:</label>
    <input name="nombre" type="text" required />
    <label>Descripción:</label>
    <input name="descripcion" type="text" />
    <label>Color del trazo:</label>
    <input name="color" type="color" value="#ff0000" />
    <label>Distancia (km):</label>
    <input name="distancia" type="text" readonly />
    <label>Colores de buffer:</label>
    <select name="buffers" id="buffers-select" multiple size="6" style="width:100%;margin-bottom:4px;"></select>
    <div id="buffers-chips" style="margin-bottom:8px;"></div>
    <label>Colores de hilos:</label>
    <select name="hilos" id="hilos-select" multiple size="6" style="width:100%;margin-bottom:4px;"></select>
    <div id="hilos-chips" style="margin-bottom:8px;"></div>
    <label>Total de hilos:</label>
    <input name="hilos_total" type="text" readonly value="0" />
    <div class="modal-actions">
      <button type="submit" class="btn-save">Guardar</button>
      <button type="button" class="btn-cancel" onclick="window.cerrarModalTramo && window.cerrarModalTramo()">Cancelar</button>
    </div>
  </form>
</div>
`;

export function abrirModalTrazo(puntos, onSave) {
  // Chips visuales para buffers y hilos seleccionados
  function renderChips() {
    const buffersSelect = document.getElementById('buffers-select');
    const hilosSelect = document.getElementById('hilos-select');
    const buffersChips = document.getElementById('buffers-chips');
    const hilosChips = document.getElementById('hilos-chips');
    buffersChips.innerHTML = '';
    hilosChips.innerHTML = '';
    Array.from(buffersSelect.selectedOptions).forEach(opt => {
      const chip = document.createElement('span');
      chip.textContent = opt.textContent;
      chip.style.display = 'inline-block';
      chip.style.background = opt.value;
      chip.style.color = '#fff';
      chip.style.fontWeight = 'bold';
      chip.style.padding = '6px 16px';
      chip.style.margin = '2px 6px 2px 0';
      chip.style.borderRadius = '16px';
      chip.style.boxShadow = '0 1px 4px #0002';
      chip.style.fontSize = '15px';
      chip.style.border = '2px solid #fff';
      chip.style.textShadow = '0 1px 2px #0006';
      buffersChips.appendChild(chip);
    });
    Array.from(hilosSelect.selectedOptions).forEach(opt => {
      const chip = document.createElement('span');
      chip.textContent = opt.textContent;
      chip.style.display = 'inline-block';
      chip.style.background = opt.value;
      chip.style.color = '#fff';
      chip.style.fontWeight = 'bold';
      chip.style.padding = '6px 16px';
      chip.style.margin = '2px 6px 2px 0';
      chip.style.borderRadius = '16px';
      chip.style.boxShadow = '0 1px 4px #0002';
      chip.style.fontSize = '15px';
      chip.style.border = '2px solid #fff';
      chip.style.textShadow = '0 1px 2px #0006';
      hilosChips.appendChild(chip);
    });
  }
  if (document.getElementById('modal-trazo-bg')) return;
  window.__interactionLock = true;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const form = document.getElementById('form-trazo');
  form.distancia.value = calcularDistancia(puntos);
  // Colores estándar de fibra óptica
  const coloresFibra = [
    {nombre:'Azul', color:'#1f4fff'},
    {nombre:'Naranja', color:'#ff7f00'},
    {nombre:'Verde', color:'#00b140'},
    {nombre:'Marrón', color:'#a0522d'},
    {nombre:'Gris', color:'#bdbdbd'},
    {nombre:'Blanco', color:'#ffffff'},
    {nombre:'Rojo', color:'#ff0000'},
    {nombre:'Negro', color:'#000000'},
    {nombre:'Amarillo', color:'#fff200'},
    {nombre:'Violeta', color:'#a259e6'},
    {nombre:'Rosa', color:'#ffb6c1'},
    {nombre:'Aqua', color:'#00e5e5'}
  ];

  // Llenar selector múltiple de buffers y hilos
  const buffersSelect = document.getElementById('buffers-select');
  const hilosSelect = document.getElementById('hilos-select');
  coloresFibra.forEach(c => {
    const opt1 = document.createElement('option');
    opt1.value = c.color;
    opt1.textContent = c.nombre;
    opt1.style.background = c.color;
    buffersSelect.appendChild(opt1);
    const opt2 = document.createElement('option');
    opt2.value = c.color;
    opt2.textContent = c.nombre;
    opt2.style.background = c.color;
    hilosSelect.appendChild(opt2);
  });

  function updateTotalHilos() {
    const nBuffers = buffersSelect.selectedOptions.length;
    const nHilos = hilosSelect.selectedOptions.length;
    form.hilos_total.value = nBuffers * nHilos;
  }
  buffersSelect.addEventListener('change', () => { updateTotalHilos(); renderChips(); });
  hilosSelect.addEventListener('change', () => { updateTotalHilos(); renderChips(); });
  setTimeout(() => { updateTotalHilos(); renderChips(); }, 10);
  // Si se pasa un objeto inicial en window.__trazoInitial (hack-light), rellenar campos
  const initial = window.__trazoInitial || null;
  // Precargar valores básicos
  if (initial) {
    if (initial.nombre) form.nombre.value = initial.nombre;
    if (initial.descripcion) form.descripcion.value = initial.descripcion;
    if (initial.color) form.color.value = initial.color;
  }
  // Precargar buffers y hilos seleccionados
  setTimeout(() => {
    if (initial && initial.buffers && Array.isArray(initial.buffers)) {
      const buffersSelect = document.getElementById('buffers-select');
      Array.from(buffersSelect.options).forEach(opt => {
        opt.selected = initial.buffers.some(b => b.color === opt.value);
      });
    }
    if (initial && initial.hilos && Array.isArray(initial.hilos)) {
      const hilosSelect = document.getElementById('hilos-select');
      Array.from(hilosSelect.options).forEach(opt => {
        opt.selected = initial.hilos.some(h => h.color === opt.value);
      });
    }
    if (typeof updateTotalHilos === 'function') updateTotalHilos();
    if (typeof renderChips === 'function') renderChips();
  }, 30);
  form.onsubmit = function(e) {
    e.preventDefault();
    // Buffers seleccionados
    const selectedBuffers = Array.from(buffersSelect.selectedOptions).map(o => ({nombre: o.textContent, color: o.value}));
    // Hilos seleccionados
    const selectedHilos = Array.from(hilosSelect.selectedOptions).map(o => ({nombre: o.textContent, color: o.value}));
    const totalHilos = selectedBuffers.length * selectedHilos.length;
    const nuevo = {
      nombre: form.nombre.value,
      descripcion: form.descripcion.value,
      color: form.color.value,
      distancia: parseFloat(form.distancia.value) || 0,
      buffers: selectedBuffers,
      hilos: selectedHilos,
      totalHilos,
      puntos: Array.isArray(puntos) ? puntos.slice() : []
    };
    if (typeof onSave === 'function') {
      onSave(nuevo);
      logStep('Guardar trazo', nuevo.nombre);
    } else {
      trazos.push(nuevo);
      logStep('Guardar trazo', nuevo.nombre);
      alert('Tramo guardado correctamente');
      guardarTrazosLS();
    }
    cerrarModalTramo();
  };
  // Listener para cerrar con click en fondo
  const bg = document.getElementById('modal-trazo-bg');
  if (bg) {
    bg.onclick = function() { cerrarModalTramo(); };
  }
  // Listener para cerrar con la X (si existe)
  const closeBtn = document.querySelector('#modal-trazo .close, #modal-trazo .btn-close');
  if (closeBtn) {
    closeBtn.onclick = function() { cerrarModalTramo(); };
  }
  // Listener para botón eliminar
  setTimeout(() => {
    const actions = document.querySelector('#modal-trazo .modal-actions');
    if (actions && window.__trazoOnDelete && !document.getElementById('__delete_trazo_btn')) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-cancel';
      deleteBtn.id = '__delete_trazo_btn';
      deleteBtn.style.marginLeft = '8px';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.onclick = function() {
        if (typeof window.__trazoOnDelete === 'function') {
          window.__trazoOnDelete();
        }
        cerrarModalTramo();
      };
      actions.appendChild(deleteBtn);
    }
  }, 30);
  // MODIFICACIÓN: Cambia el texto del botón de guardar en el modal de trazo
  const saveBtn = document.querySelector('#modal-trazo .btn-save');
  if (saveBtn) {
    saveBtn.textContent = 'Guardar trazo';
  }
  window.cerrarModalTramo = cerrarModalTramo;
}
export function cerrarModalTramo() {
  const bg = document.getElementById('modal-trazo-bg');
  const modal = document.getElementById('modal-trazo');
  if (bg) bg.remove();
  if (modal) modal.remove();
  window.__trazoOnDelete = null;
  window.__trazoInitial = null;
  window.__interactionLock = false;
}


// --- Modal para marcadores ---
const modalMarcadorHtml = `
<style>
#modal-marcador-bg { position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.18);z-index:9998; }
#modal-marcador { position:fixed;top:50%;left:50%;transform:translate(-50%,-50%); background:#fff;padding:18px;border-radius:10px;box-shadow:0 8px 32px #0002;z-index:9999;min-width:300px; }
#modal-marcador label{display:block;margin-top:8px;font-weight:500}
#modal-marcador input[type=text],#modal-marcador textarea{width:100%;padding:8px;margin-top:6px;border-radius:6px;border:1px solid #e3e3e3}
#modal-marcador .modal-actions{margin-top:12px;display:flex;gap:10px}
#modal-marcador button{padding:8px 14px;border-radius:6px;border:none;cursor:pointer}
#modal-marcador .btn-save{background:#2563eb;color:#fff}
#modal-marcador .btn-cancel{background:#ef4444;color:#fff}
</style>
<div id="modal-marcador-bg"></div>
<div id="modal-marcador">
  <form id="form-marcador">
    <label>Nombre del marcador</label>
    <input name="nombre" type="text" required />
    <label>Descripción</label>
    <textarea name="descripcion" rows="3"></textarea>
    <label>Ubicación (lat,lng)</label>
    <input name="latlng" type="text" readonly />
    <div class="modal-actions">
      <button type="submit" class="btn-save">Guardar</button>
      <button type="button" class="btn-cancel" onclick="window.cerrarModalMarcador && window.cerrarModalMarcador()">Cancelar</button>
    </div>
  </form>
</div>
`;

// --- MODIFICACIÓN: Eliminar el botón extra de eliminar en el modal de marcador ---
// En abrirModalMarcador, solo agregar el botón si no existe ya y si window.__marcadorOnDelete está definido
export function abrirModalMarcador(latlng, onSave) {
  if (document.getElementById('modal-marcador-bg')) return;
  window.__interactionLock = true;
  document.body.insertAdjacentHTML('beforeend', modalMarcadorHtml);
  const form = document.getElementById('form-marcador');
  form.latlng.value = `${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
  const initial = window.__marcadorInitial || null;
  if (initial) {
    if (initial.nombre) form.nombre.value = initial.nombre;
    if (initial.descripcion) form.descripcion.value = initial.descripcion;
  }
  form.onsubmit = function(e) {
    e.preventDefault();
    const nuevo = {
      nombre: form.nombre.value || 'Sin nombre',
      descripcion: form.descripcion.value || '',
      lat: latlng.lat,
      lng: latlng.lng,
      createdAt: (new Date()).toISOString()
    };
    if (typeof onSave === 'function') onSave(nuevo);
    logStep('Guardar marcador', nuevo.nombre);
    cerrarModalMarcador();
  };
  // SOLO agregar botón eliminar si window.__marcadorOnDelete existe y no hay ya un botón
  setTimeout(() => {
    const actions = document.querySelector('#modal-marcador .modal-actions');
    if (actions && window.__marcadorOnDelete && !document.getElementById('__delete_marcador_btn')) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn-cancel';
      deleteBtn.id = '__delete_marcador_btn';
      deleteBtn.style.marginLeft = '8px';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.onclick = function() {
        if (typeof window.__marcadorOnDelete === 'function') {
          window.__marcadorOnDelete();
        }
        cerrarModalMarcador();
      };
      actions.appendChild(deleteBtn);
    }
  }, 30);
  window.cerrarModalMarcador = cerrarModalMarcador;
}
export function cerrarModalMarcador() {
  try { if (typeof window.__marcadorOnClose === 'function') window.__marcadorOnClose(); } catch(e) {}
  const bg = document.getElementById('modal-marcador-bg');
  const modal = document.getElementById('modal-marcador');
  if (bg) bg.remove();
  if (modal) modal.remove();
  window.__marcadorInitial = null;
  window.__marcadorOnClose = null;
  window.__marcadorOnDelete = null;
  // Libera el lock SIEMPRE
  window.__interactionLock = false;
  // Elimina botón flotante si existe
  if (window.__tramosMapInstance && window.__tramosMapInstance._deleteBtn) {
    try { window.__tramosMapInstance._deleteBtn.remove(); } catch(e){}
    window.__tramosMapInstance._deleteBtn = null;
  }
}


// --- Clase para integración con Leaflet ---
export class TramosMap {
  constructor(map, infoDiv) {
    this.map = map;
    this.infoDiv = infoDiv;
    this.tramos = [];
    this.marcadores = [];
    this._markerLayers = [];
    // Layer groups for filtering by type
    this._trazosLayer = L.layerGroup();
    this._markerGroups = Object.create(null);
    // visible state map
    this._visibleGroups = Object.create(null);
    this._placingMarker = false;
    this._markerType = 'pin';
    this._interactionLock = false;
    this.currentPoints = [];
    this.currentLine = null;
    this.lines = [];
    this.drawing = false;
    this._toggleBtn = null;
    this._finishBtn = null;
    this._deleteBtn = null;
    window.__tramosMapInstance = this;
    this._baseLayerAdded = false;
    this._setupMap();
    this._addBaseLayerControl();
    this._addControls();
    this._setupGuardarListeners();
    this._renderInfo();
    // Initialize default marker groups and add to map
    ['pin','flag','star','caja','mufa','poste','manga','nap1','reserva'].forEach(k => {
      this._markerGroups[k] = L.layerGroup().addTo(this.map);
      this._visibleGroups[k] = true;
    });
    // add trazos layer by default
    this._trazosLayer.addTo(this.map);
    this._visibleGroups['trazos'] = true;
  }

  // Agrega el selector de tipo de mapa (callejero/satélite) solo una vez
  _addBaseLayerControl() {
    if (this._baseLayerAdded) return;
    // Define los mapas base
    const callejero = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    });
    const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri & contributors',
      maxZoom: 22, // permite acercar más
      maxNativeZoom: 19 // evita error "map data not yet available"
    });
    // Si el mapa no tiene capas, agrega la callejera por defecto
    if (this.map && this.map._layers && Object.keys(this.map._layers).length === 0) {
      callejero.addTo(this.map);
    }
    const baseLayers = {
      'Callejero': callejero,
      'Satélite': satelite
    };
    L.control.layers(baseLayers, null, { position: 'topright', collapsed: false }).addTo(this.map);
    this._baseLayerAdded = true;
  }

  _setupMap() {
    // Click-to-add: when drawing, clicks add fixed points; mousemove shows preview
  this.map.on('click', (e) => {
      // Marker placement takes precedence when enabled
  if (this._placingMarker) {
        const latlng = e.latlng;
        if (this._interactionLock) return; // avoid overlapping interactions
  this._interactionLock = true;
  this._updateGuardarButton();
  // ensure modal close hook restores lock and UI (keep placing active)
  try { window.__marcadorOnClose = () => {
        this._interactionLock = false;
        this._updateGuardarButton();
        if (this._addMarkerBtn) {
          this._addMarkerBtn.innerText = this._placingMarker ? 'Cancelar marcador' : 'Agregar marcador';
        }
        if (this.map && this.map.getContainer) {
          this.map.getContainer().style.cursor = this._placingMarker ? 'crosshair' : '';
        }
      }; } catch(e) {}
  // abrir modal para nombre/descripcion
  abrirModalMarcador(latlng, (nuevo) => {
          // attach tipo seleccionado
          nuevo.tipo = this._markerType || 'pin';
          this.addMarker(nuevo);
          this._interactionLock = false;
          this._updateGuardarButton();
        });
        // keep placing mode active so user can add multiple markers
        // ensure UI/cursor reflect current placing state
        if (this._addMarkerBtn) this._addMarkerBtn.innerText = 'Cancelar marcador';
        if (this.map && this.map.getContainer) this.map.getContainer().style.cursor = 'crosshair';
        return;
      }
  if (!this.drawing) return;
      const { lat, lng } = e.latlng;
      this.currentPoints.push([lat, lng]);
      this._redrawCurrentLine();
      this._updateFinishBtnVisibility();
    });

  // double-click on map ignored for now

    // mousemove preview when drawing
    this.map.on('mousemove', (e) => {
      if (!this.drawing) return;
      if (!this.currentPoints.length) return;
      const latlng = e.latlng;
      const previewPoints = this.currentPoints.concat([[latlng.lat, latlng.lng]]);
      if (this._previewLine) this.map.removeLayer(this._previewLine);
      this._previewLine = L.polyline(previewPoints, { color: '#60a5fa', weight: 3, dashArray: '6,4' }).addTo(this.map);
      this.updateDistanceLabel(previewPoints);
    });
  }

  redrawCurrentLine() {
    if (this.currentLine) this.map.removeLayer(this.currentLine);
    this.removePointMarkers();
    if (this.currentPoints.length > 0) {
      this.currentLine = L.polyline(this.currentPoints, { color: '#2563eb', weight: 4 }).addTo(this.map);
      this.updateDistanceLabel(this.currentPoints);
      // Marcadores editables para cada punto
      this._pointMarkers = this.currentPoints.map((pt, idx) => {
        const marker = L.circleMarker(pt, { radius: 7, color: '#2563eb', fillColor: '#fff', fillOpacity: 1, weight: 2 }).addTo(this.map);
        marker.on('mousedown', (ev) => {
          marker.dragging.enable();
        });
        marker.on('drag', (ev) => {
          const pos = marker.getLatLng();
          this.currentPoints[idx] = [pos.lat, pos.lng];
          this.redrawCurrentLine();
        });
        marker.on('mouseup', (ev) => {
          marker.dragging.disable();
        });
        marker.on('contextmenu', (ev) => {
          // Eliminar punto con click derecho si hay al menos 3
          if (this.currentPoints.length > 2) {
            this.currentPoints.splice(idx, 1);
            this.redrawCurrentLine();
          }
        });
        marker.on('dblclick', (ev) => {
          // Agregar punto entre este y el siguiente
          if (idx < this.currentPoints.length - 1) {
            const next = this.currentPoints[idx + 1];
            const lat = (pt[0] + next[0]) / 2;
            const lng = (pt[1] + next[1]) / 2;
            this.currentPoints.splice(idx + 1, 0, [lat, lng]);
            this.redrawCurrentLine();
          }
        });
        return marker;
      });
    }
  }

  removePointMarkers() {
    if (Array.isArray(this._pointMarkers)) {
      this._pointMarkers.forEach(m => { try { this.map.removeLayer(m); } catch(e){} });
    }
    this._pointMarkers = [];
  }

  updateDistanceLabel(points) {
    const dist = calcularDistancia(points || []);
    if (!this._distanceLabel) {
      this._distanceLabel = L.control({position: 'topright'});
      this._distanceLabel.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'leaflet-bar');
        div.id = '__dist_label';
        div.style.background = '#fff';
        div.style.padding = '6px 12px';
        div.style.borderRadius = '6px';
        div.style.boxShadow = '0 2px 8px #0002';
        div.style.fontWeight = 'bold';
        div.style.fontSize = '15px';
        div.innerHTML = `Distancia: <span id="__dist_val">${dist} km</span>`;
        return div;
      };
      this._distanceLabel.addTo(this.map);
    } else {
      const el = document.getElementById('__dist_val');
      if (el) el.textContent = `${dist} km`;
    }
  }

  _addControls() {
    const self = this;
    const control = L.control({ position: 'bottomright' });
    control.onAdd = function(map) {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-tramos-control');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '6px';
      container.style.padding = '6px';

      // Botón principal para dibujar
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.title = 'Activar modo dibujo';
      toggle.innerText = 'Dibujar';
      toggle.style.padding = '6px 8px';
      toggle.style.background = '#2563eb';
      toggle.style.color = '#fff';
      toggle.style.border = 'none';
      toggle.style.borderRadius = '4px';
      toggle.style.cursor = 'pointer';
      self._toggleBtn = toggle;

      // Botón para terminar trazo
      const finish = document.createElement('button');
      finish.type = 'button';
      finish.title = 'Guardar trazo';
      finish.innerText = 'Guardar trazo';
      finish.style.padding = '6px 8px';
      finish.style.background = '#16a34a';
      finish.style.color = '#fff';
      finish.style.border = 'none';
      finish.style.borderRadius = '4px';
      finish.style.cursor = 'pointer';
      finish.style.display = 'none';
      self._finishBtn = finish;
      finish.onclick = function(ev) {
        ev.stopPropagation();
        self.finishTramo();
      };

      toggle.onclick = function(ev) {
        ev.stopPropagation();
        if (!self.drawing) {
          self.enableDrawing();
          self._finishBtn.style.display = 'inline-block';
        } else {
          self.disableDrawing();
          self._finishBtn.style.display = 'none';
        }
      };

      container.appendChild(toggle);
      container.appendChild(finish);

      // Agregar boton para marcadores
      const addMarkerBtn = document.createElement('button');
      addMarkerBtn.type = 'button';
      addMarkerBtn.title = 'Agregar marcador';
      addMarkerBtn.innerText = 'Agregar marcador';
      addMarkerBtn.style.padding = '6px 8px';
      addMarkerBtn.style.background = '#f59e0b';
      addMarkerBtn.style.color = '#fff';
      addMarkerBtn.style.border = 'none';
      addMarkerBtn.style.borderRadius = '4px';
      addMarkerBtn.style.cursor = 'pointer';
      addMarkerBtn.onclick = function(ev) {
        ev.stopPropagation();
        // Toggle placing marker mode
        self._placingMarker = !self._placingMarker;
        addMarkerBtn.innerText = self._placingMarker ? 'Cancelar marcador' : 'Agregar marcador';
        if (self.map && self.map.getContainer) self.map.getContainer().style.cursor = self._placingMarker ? 'crosshair' : '';
      };
  container.appendChild(addMarkerBtn);
  // expose addMarkerBtn so modal hooks can update it
  self._addMarkerBtn = addMarkerBtn;

      // Marker type chooser with inline SVG icons
      const chooser = document.createElement('div');
      chooser.style.display = 'flex';
      chooser.style.gap = '6px';
      chooser.style.marginTop = '6px';
      chooser.style.alignItems = 'center';
      // Prefer bundled PNG icons (already present in public/build/assets)
      // map: pin -> manga.png, flag -> nap_2.png, star -> reserva.png
      const icons = {
        // Use persistent public images (place these files in public/images/)
        pin: `<img src="/images/manga.png" alt="pin" width="28" height="36" style="display:block"/>`,
        flag: `<img src="/images/nap_2.png" alt="flag" width="28" height="28" style="display:block"/>`,
        star: `<img src="/images/reserva.png" alt="star" width="28" height="28" style="display:block"/>`
      };
        Object.keys(icons).forEach(type => {
          const b = document.createElement('button');
          b.type = 'button';
          b.title = type;
          b.innerHTML = icons[type];
          b.style.padding = '4px';
          b.style.borderRadius = '6px';
          b.style.border = '1px solid transparent';
          b.style.background = 'white';
          b.style.cursor = 'pointer';
          b.onclick = (e) => { e.stopPropagation(); self._markerType = type; 
            // highlight selection
            Array.from(chooser.children).forEach(ch => ch.style.border = '1px solid transparent');
            b.style.border = '1px solid #2563eb';
          };
          chooser.appendChild(b);
        });
      // pre-select default
      if (chooser.firstChild) chooser.firstChild.style.border = '1px solid #2563eb';
      container.appendChild(chooser);

      // Add edit-toggle button for enabling marker drag/edit mode
      const editMarkersBtn = document.createElement('button');
      editMarkersBtn.type = 'button';
      editMarkersBtn.title = 'Editar marcadores';
      editMarkersBtn.innerText = 'Editar marcadores';
      editMarkersBtn.style.padding = '6px 8px';
      editMarkersBtn.style.background = '#6b7280';
      editMarkersBtn.style.color = '#fff';
      editMarkersBtn.style.border = 'none';
      editMarkersBtn.style.borderRadius = '4px';
      editMarkersBtn.style.cursor = 'pointer';
      editMarkersBtn.onclick = function(ev) {
        ev.stopPropagation();
        // toggle edit mode: make markers draggable
        const enabling = !self._markersEditable;
        self._setMarkersEditable(enabling);
        editMarkersBtn.innerText = enabling ? 'Salir edición' : 'Editar marcadores';
        editMarkersBtn.style.background = enabling ? '#2563eb' : '#6b7280';
      };
      container.appendChild(editMarkersBtn);

      // --- Filtros por tipo (Tramos / Mangas / NAP1 / Reservas / Cajas / Mufas / Postes) ---
      const filtrosDiv = document.createElement('div');
      filtrosDiv.style.display = 'flex';
      filtrosDiv.style.flexDirection = 'column';
      filtrosDiv.style.gap = '6px';
      filtrosDiv.style.marginTop = '8px';
      filtrosDiv.style.paddingTop = '6px';
      filtrosDiv.style.borderTop = '1px solid #eee';

      const filters = [
        { key: 'trazos', label: 'Tramos' },
        { key: 'pin', label: 'Mangas' },
        { key: 'flag', label: 'Cajas NAT' },
        { key: 'star', label: 'Reservas' },
      ];
      filters.forEach(f => {
        const row = document.createElement('label');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '6px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = true;
        cb.dataset.layer = f.key;
        cb.onchange = (e) => {
          const layer = e.target.dataset.layer;
          // use self (closure) to reference instance
          self.setLayerVisibility(layer, !!e.target.checked);
        };
        const span = document.createElement('span');
        span.style.fontSize = '13px';
        span.style.color = '#333';
        span.textContent = f.label;
        row.appendChild(cb);
        row.appendChild(span);
        filtrosDiv.appendChild(row);
      });
      container.appendChild(filtrosDiv);

      // --- Buscador de lugares (Nominatim) en la esquina superior izquierda ---
      if (!self._searchControlAdded) {
        const searchControl = L.control({ position: 'topleft' });
        searchControl.onAdd = function(map) {
          const searchDiv = L.DomUtil.create('div', 'leaflet-bar leaflet-control custom-search-control');
          searchDiv.style.display = 'flex';
          searchDiv.style.flexDirection = 'column';
          searchDiv.style.gap = '4px';
          searchDiv.style.padding = '6px';
          searchDiv.style.background = '#fff';
          searchDiv.style.borderRadius = '6px';
          searchDiv.style.boxShadow = '0 2px 8px #0002';
          searchDiv.style.minWidth = '220px';

          const row = document.createElement('div');
          row.style.display = 'flex';
          row.style.gap = '4px';
          row.style.alignItems = 'center';
          const searchInput = document.createElement('input');
          searchInput.type = 'text';
          searchInput.placeholder = 'Buscar lugar...';
          searchInput.style.padding = '5px 8px';
          searchInput.style.borderRadius = '4px';
          searchInput.style.border = '1px solid #ccc';
          searchInput.style.flex = '1';
          const searchBtn = document.createElement('button');
          searchBtn.type = 'button';
          searchBtn.innerText = 'Buscar';
          searchBtn.style.padding = '5px 10px';
          searchBtn.style.background = '#2563eb';
          searchBtn.style.color = '#fff';
          searchBtn.style.border = 'none';
          searchBtn.style.borderRadius = '4px';
          searchBtn.style.cursor = 'pointer';
          row.appendChild(searchInput);
          row.appendChild(searchBtn);
          searchDiv.appendChild(row);

          // Resultados de búsqueda
          const resultsDiv = document.createElement('div');
          resultsDiv.style.maxHeight = '120px';
          resultsDiv.style.overflowY = 'auto';
          resultsDiv.style.background = '#fff';
          resultsDiv.style.position = 'absolute';
          resultsDiv.style.zIndex = '9999';
          resultsDiv.style.left = '0';
          resultsDiv.style.right = '0';
          resultsDiv.style.top = '100%';
          resultsDiv.style.boxShadow = '0 2px 8px #0002';
          resultsDiv.style.display = 'none';
          searchDiv.appendChild(resultsDiv);

          let searchMarkers = [];
          function clearSearchMarkers() {
            searchMarkers.forEach(m => m.remove());
            searchMarkers = [];
          }

          function showResults(results) {
            resultsDiv.innerHTML = '';
            if (!results.length) {
              resultsDiv.innerHTML = '<div style="padding:8px;color:#888">No se encontraron lugares</div>';
            } else {
              results.forEach(place => {
                const item = document.createElement('div');
                item.style.padding = '7px 10px';
                item.style.cursor = 'pointer';
                item.style.borderBottom = '1px solid #eee';
                item.innerHTML = `<b>${place.display_name.split(',')[0]}</b><br><span style='font-size:12px;color:#666'>${place.display_name}</span>`;
                item.onclick = () => {
                  // Centrar mapa y poner marcador
                  map.setView([parseFloat(place.lat), parseFloat(place.lon)], 17);
                  clearSearchMarkers();
                  const marker = L.marker([parseFloat(place.lat), parseFloat(place.lon)]).addTo(map)
                    .bindPopup(`<b>${place.display_name.split(',')[0]}</b>`).openPopup();
                  searchMarkers.push(marker);
                  resultsDiv.style.display = 'none';
                };
                resultsDiv.appendChild(item);
              });
            }
            resultsDiv.style.display = 'block';
          }

          searchBtn.onclick = function() {
            const q = searchInput.value.trim();
            if (!q) return;
            resultsDiv.innerHTML = '<div style="padding:8px">Buscando...</div>';
            resultsDiv.style.display = 'block';
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
              .then(r => r.json())
              .then(data => showResults(data))
              .catch(() => {
                resultsDiv.innerHTML = '<div style="padding:8px;color:#e00">Error al buscar</div>';
                resultsDiv.style.display = 'block';
              });
          };
          searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
              e.preventDefault();
              searchBtn.click();
            }
          });
          // Ocultar resultados al hacer click fuera
          document.addEventListener('click', function hideResults(e) {
            if (!searchDiv.contains(e.target)) {
              resultsDiv.style.display = 'none';
            }
          });
          // Limpiar marcadores de búsqueda al cambiar texto
          searchInput.addEventListener('input', clearSearchMarkers);

          return searchDiv;
        };
        searchControl.addTo(self.map);
        self._searchControlAdded = true;
      }

      // Guardamos referencias para actualizaciones desde la instancia
      self._toggleBtn = toggle;
      self._finishBtn = finish;
      // Add a global "Guardar todo" button that triggers the page-level save
      const guardarBtn = document.createElement('button');
      guardarBtn.type = 'button';
      guardarBtn.title = 'Guardar todo';
      guardarBtn.innerText = 'Guardar todo';
      guardarBtn.style.padding = '6px 8px';
      guardarBtn.style.background = '#16a34a';
      guardarBtn.style.color = '#fff';
      guardarBtn.style.border = 'none';
      guardarBtn.style.borderRadius = '4px';
      guardarBtn.style.cursor = 'pointer';
      guardarBtn.onclick = function(ev) {
        ev.stopPropagation();
        if (self._interactionLock) return; // disabled while editing
        // Dispatch an event that the page-level save handler listens for
        document.dispatchEvent(new CustomEvent('tramos:save'));
      };
      self._guardarBtn = guardarBtn;
      container.appendChild(guardarBtn);

      // Agregar selector de tipo de mapa (base layer)
      // Usar correctamente la instancia del mapa (cerradura `self`) y evitar duplicados
      if (!self._baseLayerAdded) {
        const baseLayers = {
          "Callejero": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }),
          "Satélite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri & contributors',
            maxZoom: 22, // permite acercar más
            maxNativeZoom: 19 // evita error "map data not yet available"
          })
        };
        // Añadir la capa base por defecto si aún no existe
        baseLayers["Callejero"].addTo(self.map);
        L.control.layers(baseLayers, null, { position: 'topright', collapsed: false }).addTo(self.map);
        self._baseLayerAdded = true;
      }

      // Prevenir que el control interfiera con el mapa (panning)
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      return container;
    };
    control.addTo(this.map);
  }

  // Map various incoming type strings to canonical internal keys
  _canonicalMarkerType(type) {
    if (!type) return 'pin';
    const t = String(type).toLowerCase();
    if (t === 'pin' || t === 'manga' || t === 'mangas' || t.indexOf('mang') !== -1) return 'pin';
    if (t === 'flag' || t === 'nap1' || t.indexOf('nap') !== -1) return 'flag';
    if (t === 'star' || t === 'reserva' || t === 'reservas') return 'star';
    if (t === 'caja' || t === 'boxes') return 'caja';
    if (t === 'mufa' || t === 'mufas') return 'mufa';
    if (t === 'poste' || t === 'postes') return 'poste';
    // fallback
    return t;
  }

  // Control visibility of a named layer/group
  setLayerVisibility(name, visible) {
    if (!name) return;
    if (name === 'trazos') {
      if (visible && !this._visibleGroups['trazos']) {
        this._trazosLayer.addTo(this.map);
      } else if (!visible && this._visibleGroups['trazos']) {
        try { this.map.removeLayer(this._trazosLayer); } catch(e) {}
      }
      this._visibleGroups['trazos'] = !!visible;
      // mark tramos included/excluded according to visibility
      this.tramos.forEach((t, idx) => {
        t.included = !!visible;
        // also add/remove corresponding polyline from trazos layer
        try {
          const poly = this.lines[idx];
          if (poly) {
            if (visible) this._trazosLayer.addLayer(poly);
            else this._trazosLayer.removeLayer(poly);
          }
        } catch(e) {}
      });
      // Emit change so UI and save flows update
      try { this._renderInfo(); } catch (e) {}
      return;
    }
    const group = this._markerGroups[name];
    if (!group) return;
    if (visible && !this._visibleGroups[name]) {
      group.addTo(this.map);
    } else if (!visible && this._visibleGroups[name]) {
      try { this.map.removeLayer(group); } catch(e) {}
    }
    this._visibleGroups[name] = !!visible;
    // mark markers of that canonical type as included/excluded and add/remove from group
    this.marcadores.forEach((m, idx) => {
      try {
        const canonical = this._canonicalMarkerType(m.tipo || m.type || m);
        if (canonical === name) {
          m.included = !!visible;
          const layer = this._markerLayers[idx];
          if (layer) {
            if (visible) {
              const g = this._markerGroups[canonical] || this._markerGroups['pin'];
              g.addLayer(layer);
            } else {
              try { (this._markerGroups[canonical] || this._markerGroups['pin']).removeLayer(layer); } catch(e) { try { this.map.removeLayer(layer); } catch(e){} }
            }
          }
        }
      } catch (e) {}
    });
    // Emit change so UI and save flows update
    try { this._renderInfo(); } catch (e) {}
  }

  toggleLayer(name) {
    const cur = !!this._visibleGroups[name];
    this.setLayerVisibility(name, !cur);
  }

  // Expose a method to update UI state for the guardar button
  _updateGuardarButton() {
    if (!this._guardarBtn) return;
    this._guardarBtn.disabled = !!this._interactionLock;
    this._guardarBtn.title = this._interactionLock ? 'No disponible mientras se edita' : 'Guardar todo';
  }

  // Setup listeners so the guardar button reflects saving state
  _setupGuardarListeners() {
    const self = this;
    document.addEventListener('tramos:saving', () => {
      if (!self._guardarBtn) return;
      self._guardarBtn.disabled = true;
      const original = self._guardarBtn.innerText;
      self._guardarBtn._origText = original;
      self._guardarBtn.innerText = 'Guardando...';
    });
    document.addEventListener('tramos:saved', (ev) => {
      if (!self._guardarBtn) return;
      self._guardarBtn.disabled = !!self._interactionLock;
      self._guardarBtn.innerText = self._guardarBtn._origText || 'Guardar todo';
    });
  }

  // Add a marker object to internal state and render on map
  addMarker(marcador) {
    const safe = Object.assign({ nombre: 'Sin nombre', descripcion: '', lat: 0, lng: 0, tipo: this._markerType || 'pin', createdAt: (new Date()).toISOString() }, marcador || {});
    // Try to use bundle PNG icons if present
    const iconByType = {
      // Use persistent public images (place these files in public/images/)
      pin: '/images/manga.png',
      flag: '/images/nap_2.png',
      star: '/images/reserva.png'
    };
    let markerObj = null;
    try {
      const url = iconByType[safe.tipo];
      if (url) {
      const icon = L.icon({ iconUrl: url, iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -36] });
      markerObj = L.marker([safe.lat, safe.lng], { icon });
      }
    } catch (err) {
      // ignore and fallback
      markerObj = null;
    }
  // Fallback to SVG divIcon if PNG icon creation failed or not found
    if (!markerObj) {
      const svgByType = {
        pin: `<svg width="34" height="44" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C7.03 0 3 4.03 3 9c0 7.5 9 19 9 19s9-11.5 9-19c0-4.97-4.03-9-9-9z" fill="#ef4444"/><circle cx="12" cy="9" r="3" fill="#fff"/></svg>`,
        flag: `<svg width="34" height="34" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 2v20" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/><path d="M8 4c3-1 6 0 9 0s5-1 5-1v12s-2 1-5 1-6-1-9 0" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
        star: `<svg width="34" height="34" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l2.6 6.6L22 10l-5 3.6L18 22l-6-3.4L6 22l1-8.4L2 10l7.4-1.4L12 2z" fill="#f59e0b"/></svg>`
      };
      const iconHtml = svgByType[safe.tipo] ? `<div style="display:flex;align-items:center;justify-content:center">${svgByType[safe.tipo]}</div>` : `<div style="background:#fff;padding:4px;border-radius:6px;border:1px solid #ddd">${safe.nombre}</div>`;
      const icon = L.divIcon({ className: 'custom-marker ' + safe.tipo, html: iconHtml, iconAnchor: [12, 34] });
      markerObj = L.marker([safe.lat, safe.lng], { icon });
    }
    // Persist a plain object (no Leaflet instance) in marcadores
    const plain = { nombre: safe.nombre, descripcion: safe.descripcion, lat: safe.lat, lng: safe.lng, tipo: safe.tipo, createdAt: safe.createdAt, included: true };
    const self = this;
    function _buildMarkerPopup(p) {
      const rawType = (p.tipo || p.type || '').toString().toLowerCase();
      const canonical = (typeof self._canonicalMarkerType === 'function') ? self._canonicalMarkerType(rawType) : rawType;
      let tipoHumano = '';
      if (canonical === 'pin') {
        if (rawType.indexOf('mufa') !== -1) tipoHumano = 'Mufa';
        else tipoHumano = 'Manga';
      } else if (canonical === 'star') {
        tipoHumano = 'Reserva';
      } else if (canonical === 'flag') {
        tipoHumano = 'Caja NAT';
      } else if (rawType && rawType.length) {
        tipoHumano = rawType.charAt(0).toUpperCase() + rawType.slice(1);
      }
      const nombre = p.nombre || p.name || 'Sin nombre';
      const desc = p.descripcion || p.description || '';
      const lat = typeof p.lat === 'number' ? p.lat.toFixed(6) : (p.lat || '');
      const lng = typeof p.lng === 'number' ? p.lng.toFixed(6) : (p.lng || '');
      const created = p.createdAt ? new Date(p.createdAt).toLocaleString() : '';
      return `<div style="min-width:180px;max-width:320px;font-size:13px;color:#111">
        <div style="font-weight:700;margin-bottom:6px">${nombre}</div>
        <div style="margin-bottom:6px;color:#444">${desc}</div>
        ${tipoHumano ? `<div style="font-size:12px;color:#666">Tipo: <b>${tipoHumano}</b></div>` : ''}
        <div style="font-size:12px;color:#666">Coordenadas: <span>${lat}, ${lng}</span></div>
        ${created ? `<div style="font-size:12px;color:#666">Creado: <span>${created}</span></div>` : ''}
      </div>`;
    }
    markerObj.bindPopup(_buildMarkerPopup(plain));
  // Add to internal arrays
  this.marcadores.push(plain);
  this._markerLayers.push(markerObj);
    // Place marker inside the appropriate layer group so it can be toggled
    try {
      const canonical = this._canonicalMarkerType(safe.tipo);
      // Ensure group exists
      if (!this._markerGroups[canonical]) {
        this._markerGroups[canonical] = L.layerGroup().addTo(this.map);
        this._visibleGroups[canonical] = true;
      }
      const group = this._markerGroups[canonical] || this._markerGroups['pin'];
      try {
        group.addLayer(markerObj);
        // ensure group is added to map if visible
        if (this._visibleGroups[canonical] && (!this.map.hasLayer || !this.map.hasLayer(group))) {
          try { group.addTo(this.map); } catch(e) {}
        }
      } catch (e) {
        // fallback: add marker directly to map
        try { markerObj.addTo(this.map); } catch(e){}
      }
    } catch (e) {
      try { markerObj.addTo(this.map); } catch(e){}
    }

  // show immediate feedback
  try { _showToast('Marcador agregado'); } catch(e) {}

    // Wire single-click to open popup (default) and double-click to edit/delete
    markerObj.on('click', () => {
      markerObj.openPopup();
    });
    markerObj.on('dblclick', (ev) => {
      if (this._interactionLock) return;
      this._interactionLock = true;
      this._updateGuardarButton();
      window.__marcadorInitial = Object.assign({}, plain);
      window.__marcadorOnDelete = () => {
        const idx = this._markerLayers.indexOf(markerObj);
        if (idx !== -1) {
          this.map.removeLayer(this._markerLayers[idx]);
          this._markerLayers.splice(idx, 1);
          this.marcadores.splice(idx, 1);
          this._renderInfo();
          logStep('Eliminar marcador', plain.nombre);
        }
        try { _showToast('Marcador eliminado'); } catch(e) {}
        window.__marcadorOnDelete = null;
        window.__marcadorInitial = null;
        this._interactionLock = false;
        this._updateGuardarButton();
      };
      try { window.__marcadorOnClose = () => {
        this._interactionLock = false;
        this._updateGuardarButton();
        if (this._addMarkerBtn) {
          this._addMarkerBtn.innerText = this._placingMarker ? 'Cancelar marcador' : 'Agregar marcador';
        }
        if (this.map && this.map.getContainer) {
          this.map.getContainer().style.cursor = this._placingMarker ? 'crosshair' : '';
        }
      }; } catch(e) {}
      abrirModalMarcador({lat: plain.lat, lng: plain.lng}, (nuevo) => {
        plain.nombre = nuevo.nombre;
        plain.descripcion = nuevo.descripcion;
        plain.lat = nuevo.lat;
        plain.lng = nuevo.lng;
        markerObj.setLatLng([nuevo.lat, nuevo.lng]);
        // update popup with rich content
        try { markerObj.setPopupContent(_buildMarkerPopup(plain)); } catch(e) { markerObj.setPopupContent(`<b>${nuevo.nombre}</b><br/>${nuevo.descripcion || ''}`); }
        this._renderInfo();
        logStep('Editar marcador', nuevo.nombre);
        try { _showToast('Marcador actualizado'); } catch(e) {}
        window.__marcadorOnDelete = null;
        window.__marcadorInitial = null;
        this._interactionLock = false;
        this._updateGuardarButton();
      });
    });

    this._renderInfo();
    return markerObj;
  }

  // MODIFICACIÓN: Eliminar el botón flotante y agregar el botón eliminar solo dentro del modal
  // En abrirModalTrazo, agrega el botón eliminar solo si window.__trazoOnDelete existe
  abrirModalTrazo(puntos, onSave) {
    // Evita duplicados
    if (document.getElementById('modal-trazo-bg')) return;
    window.__interactionLock = true;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const form = document.getElementById('form-trazo');
    form.distancia.value = calcularDistancia(puntos);
    // Si se pasa un objeto inicial en window.__trazoInitial (hack-light), rellenar campos
    const initial = window.__trazoInitial || null;
    if (initial) {
      if (initial.nombre) form.nombre.value = initial.nombre;
      if (initial.descripcion) form.descripcion.value = initial.descripcion;
      if (initial.color) form.color.value = initial.color;
      if (initial.hilos) form.hilos.value = initial.hilos;
      if (initial.buffer) form.buffer.value = initial.buffer;
    }
    form.onsubmit = function(e) {
      e.preventDefault();
      const nuevo = {
        nombre: form.nombre.value,
        descripcion: form.descripcion.value,
        color: form.color.value,
        distancia: parseFloat(form.distancia.value) || 0,
        hilos: parseInt(form.hilos.value) || 1,
        buffer: parseInt(form.buffer.value) || 0,
        puntos: Array.isArray(puntos) ? puntos.slice() : []
      };
      // Si se proporcionó un callback, úsalo para notificar al llamador
      if (typeof onSave === 'function') {
        onSave(nuevo);
      } else {
        // Compatibilidad: guardar en arreglo global
        trazos.push(nuevo);
        alert('Tramo guardado correctamente');
      }
      cerrarModalTramo();
    };
    // Listener para cerrar con click en fondo
    const bg = document.getElementById('modal-trazo-bg');
    if (bg) {
      bg.onclick = function() { cerrarModalTramo(); };
    }
    // Listener para cerrar con la X (si existe)
    const closeBtn = document.querySelector('#modal-trazo .close, #modal-trazo .btn-close');
    if (closeBtn) {
      closeBtn.onclick = function() { cerrarModalTramo(); };
    }
    // Listener para botón eliminar
    setTimeout(() => {
      const actions = document.querySelector('#modal-trazo .modal-actions');
      if (actions && window.__trazoOnDelete && !document.getElementById('__delete_trazo_btn')) {
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-cancel';
        deleteBtn.id = '__delete_trazo_btn';
        deleteBtn.style.marginLeft = '8px';
        deleteBtn.textContent = 'Eliminar';
        deleteBtn.onclick = function() {
          if (typeof window.__trazoOnDelete === 'function') {
            window.__trazoOnDelete();
          }
          cerrarModalTramo();
        };
        actions.appendChild(deleteBtn);
      }
    }, 30);
    window.cerrarModalTramo = cerrarModalTramo;
  }

  // Enable/disable marker dragging and update JSON on dragend
  _setMarkersEditable(enable) {
    this._markersEditable = !!enable;
    this._markerLayers.forEach((m, idx) => {
      if (enable) {
        m.dragging && m.dragging.enable ? m.dragging.enable() : m.options.draggable = true;
        m.on('dragend', () => {
          const pos = m.getLatLng();
          if (this.marcadores[idx]) {
            this.marcadores[idx].lat = +pos.lat;
            this.marcadores[idx].lng = +pos.lng;
            this._renderInfo();
            try { _showToast('Marcador movido'); } catch(e) {}
          }
        });
      } else {
        try { m.dragging && m.dragging.disable && m.dragging.disable(); } catch(e) {}
        m.off('dragend');
      }
    });
  }

  getMarkers() {
    // return only markers currently included (not filtered-out)
    return this.marcadores.filter(m => m.included !== false).map(m => Object.assign({}, m));
  }

  getAllMarkers() {
    return this.marcadores.map(m => Object.assign({}, m));
  }

  enableDrawing() {
    this.drawing = true;
    if (this._toggleBtn) this._toggleBtn.innerText = 'Cancelar';
    if (this.map && this.map.getContainer) this.map.getContainer().style.cursor = 'crosshair';
    this._updateFinishBtnVisibility();
    // ensure preview line is cleared
    if (this._previewLine) { this.map.removeLayer(this._previewLine); this._previewLine = null; }
  }

  disableDrawing() {
    this.drawing = false;
    if (this._toggleBtn) this._toggleBtn.innerText = 'Dibujar';
    if (this.map && this.map.getContainer) this.map.getContainer().style.cursor = '';
    // limpiar trazado en curso
    this.currentPoints = [];
    if (this.currentLine) {
      this.map.removeLayer(this.currentLine);
      this.currentLine = null;
    }
    if (this._finishBtn) this._finishBtn.style.display = 'none';
    // limpiar preview
    if (this._previewLine) { this.map.removeLayer(this._previewLine); this._previewLine = null; }
  }

  _updateFinishBtnVisibility() {
    if (!this._finishBtn) return;
    if (this.drawing && this.currentPoints.length > 1) this._finishBtn.style.display = 'inline-block';
    else this._finishBtn.style.display = 'none';
  }

  finishTramo() {
    if (this.currentPoints.length <= 1) return alert('Agrega al menos dos puntos para crear un trazo');
    // Finalizar trazo y limpiar overlaysF
    const nuevo = {
      nombre: 'Sin nombre',
      descripcion: '',
      color: '#2563eb',
      distancia: calcularDistancia(this.currentPoints) || 0,
      hilos: 1,
      buffer: 0,
      puntos: this.currentPoints.slice() || []
    };
    // MODIFICACIÓN: Mostrar modal para agregar nombre, descripción, etc. antes de guardar
    this._interactionLock = true;
    window.__trazoInitial = { ...nuevo };
    abrirModalTrazo(this.currentPoints, (datos) => {
      // Guardar la info del popup en el trazo
      this.addTramo(datos);
      logStep('Agregar trazo', JSON.stringify(datos));
      this._interactionLock = false;
      this.disableDrawing();
      _showToast('Tramo guardado: ' + datos.nombre);
    });
    // Si cancela el modal, también cancelar el dibujado
    window.cerrarModalTramo = () => {
      const bg = document.getElementById('modal-trazo-bg');
      const modal = document.getElementById('modal-trazo');
      if (bg) bg.remove();
      if (modal) modal.remove();
      window.__trazoInitial = null;
      this._interactionLock = false;
      this.disableDrawing();
    };
  }

  // Mousedown/mousemove/mouseup behavior for press-and-draw
  _onMouseDown(e) {
    if (!this.drawing) return;
    // start listening mousemove
    const rect = this.map.getContainer().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const latlng = this.map.containerPointToLatLng([x, y]);
    this.currentPoints = [[latlng.lat, latlng.lng]];
    this._mousemoveHandler = (ev) => this._onMouseMove(ev);
    this.map.getContainer().addEventListener('mousemove', this._mousemoveHandler);
  }

  _onMouseMove(e) {
    if (!this.drawing || !this.currentPoints.length) return;
    const rect = this.map.getContainer().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const latlng = this.map.containerPointToLatLng([x, y]);
    const last = this.currentPoints[this.currentPoints.length - 1];
    // añadimos punto solo si se movió lo suficiente para evitar exceso
    const dist = last ? distanciaEntre(last, [latlng.lat, latlng.lng]) : Infinity;
    if (dist > 1) { // >1m threshold
      this.currentPoints.push([latlng.lat, latlng.lng]);
      if (this.currentLine) this.map.removeLayer(this.currentLine);
      this.currentLine = L.polyline(this.currentPoints, { color: '#2563eb', weight: 4 }).addTo(this.map);
      this._updateFinishBtnVisibility();
    }
  }

  _onMouseUp(e) {
    if (!this.drawing) return;
    // stop listening mousemove
    if (this._mousemoveHandler) this.map.getContainer().removeEventListener('mousemove', this._mousemoveHandler);
    // place a final point where released
    const rect = this.map.getContainer().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const latlng = this.map.containerPointToLatLng([x, y]);
    if (!this.currentPoints.length) return;
    this.currentPoints.push([latlng.lat, latlng.lng]);
    if (this.currentLine) this.map.removeLayer(this.currentLine);
    this.currentLine = L.polyline(this.currentPoints, { color: '#2563eb', weight: 4 }).addTo(this.map);
    // finalize visually but do not open modal
    this._updateFinishBtnVisibility();
  }

  addTramo(tramo) {
    // normalize tramo object to ensure no nulls
    const safe = Object.assign({
      nombre: 'Sin nombre', descripcion: '', color: '#2563eb', distancia: 0, hilos: 1, buffer: 0, puntos: [], included: true
    }, tramo || {});
    if (!Array.isArray(safe.puntos)) safe.puntos = [];
    const poly = L.polyline(safe.puntos, { color: safe.color || '#2563eb', weight: 4 }).addTo(this.map);
    // Al hacer click en un trazo existente, abrir modal para editar metadatos
    poly.on('click', () => {
      // single-click: show basic popup with info
      if (this._interactionLock) return; // prevent showing when editing
      const info = `<b>${safe.nombre}</b><br/>${safe.descripcion || ''}<br/>${(safe.distancia||0)} km`;
      poly.bindPopup(info).openPopup();
    });
    poly.on('dblclick', (ev) => {
      if (window.__interactionLock) return;
      window.__interactionLock = true;
      window.__trazoInitial = { ...safe };
      window.__trazoOnDelete = () => {
        try { this._trazosLayer.removeLayer(poly); } catch(e) { try { this.map.removeLayer(poly); } catch(e){} }
        const idx = this.tramos.indexOf(safe);
        if (idx !== -1) this.tramos.splice(idx, 1);
        // also remove from lines array
        const lineIdx = this.lines.indexOf(poly);
        if (lineIdx !== -1) this.lines.splice(lineIdx, 1);
        this._renderInfo();
        logStep('Eliminar trazo', safe.nombre);
        window.__trazoInitial = null;
        window.__trazoOnDelete = null;
        window.__interactionLock = false;
        this._updateGuardarButton();
      };
      abrirModalTrazo(tramo.puntos, (nuevo) => {
        const idx = this.tramos.indexOf(safe);
        if (idx !== -1) this.tramos[idx] = Object.assign({}, nuevo);
        poly.setStyle({ color: nuevo.color || '#2563eb' });
        this._renderInfo();
        logStep('Editar trazo', nuevo.nombre);
        window.__trazoInitial = null;
        window.__trazoOnDelete = null;
        window.__interactionLock = false;
        this._updateGuardarButton();
      });
    });
    this.lines.push(poly);
    this.tramos.push(safe);
    // add poly to trazos layer so it can be toggled
    try { this._trazosLayer.addLayer(poly); } catch(e) { poly.addTo(this.map); }
    guardarTrazosLS();
    this._renderInfo();
  }

  getTramos() {
    // devolver solo trazos incluidos (filtrados) como copia segura
    return this.tramos.filter(t => t.included !== false).map(t => Object.assign({}, t));
  }

  _renderInfo() {
    if (!this.infoDiv) return;
    const trazosHtml = this.tramos.length ? this.tramos.map((t, i) => {
      let buf = t.buffers && t.buffers.length ? t.buffers.map(b => `<span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:3px;margin-right:2px;vertical-align:middle;" title="${b.nombre}"></span>`).join('') : '';
      let hil = t.hilos && t.hilos.length ? t.hilos.map(h => `<span style="display:inline-block;width:14px;height:14px;background:${h.color};border-radius:50%;margin-right:2px;vertical-align:middle;" title="${h.nombre}"></span>`).join('') : '';
      return `${i+1}. ${t.nombre} (${(t.distancia||0)} km) <br>Buffers: ${buf} <br>Hilos: ${hil}`;
    }).join('<br><br>') : 'Ninguno';
    const marcadoresHtml = this.marcadores.length ? `<br/><b>Marcadores:</b> ${this.marcadores.length}` : '';
    this.infoDiv.innerHTML = '<b>Trazos guardados:</b><br>' + trazosHtml + marcadoresHtml;
    // Emit event so other parts of the app (save flow, UI) can react to changes
    try {
      const safeTramos = this.tramos.map(t => Object.assign({}, t));
      const safeMarcadores = this.marcadores.map(m => Object.assign({}, m));
      document.dispatchEvent(new CustomEvent('tramos:changed', { detail: { tramos: safeTramos, marcadores: safeMarcadores } }));
    } catch (e) { /* no-op */ }
  }
}

// --- MODIFICACIÓN: Agrega registro de pasos de usuario en la parte inferior ---
function logStep(action, detail = '') {
  let logDiv = document.getElementById('__tramos_steps_log');
  if (!logDiv) {
    logDiv = document.createElement('div');
    logDiv.id = '__tramos_steps_log';
    logDiv.style.marginTop = '24px';
    logDiv.style.padding = '12px';
    logDiv.style.background = '#f3f4f6';
    logDiv.style.borderRadius = '8px';
    logDiv.style.fontSize = '15px';
    logDiv.innerHTML = '<b>Pasos recientes:</b><ul id="__tramos_steps_list" style="margin:8px 0 0 0;padding-left:18px;"></ul>';
    document.body.appendChild(logDiv);
  }
  const ul = document.getElementById('__tramos_steps_list');
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString()} - ${action}${detail ? ': ' + detail : ''}`;
  ul.appendChild(li);
  // Solo muestra los últimos 8 pasos
  while (ul.children.length > 8) ul.removeChild(ul.firstChild);
}
