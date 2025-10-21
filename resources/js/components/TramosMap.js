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
    <label>Número de hilos:</label>
    <input name="hilos" type="number" min="1" value="1" />
    <label>Número de buffer:</label>
    <input name="buffer" type="number" min="0" value="0" />
    <div class="modal-actions">
      <button type="submit" class="btn-save">Guardar</button>
      <button type="button" class="btn-cancel" onclick="window.cerrarModalTramo && window.cerrarModalTramo()">Cancelar</button>
    </div>
  </form>
</div>
`;

export function abrirModalTrazo(puntos, onSave) {
  // Evita duplicados
  if (document.getElementById('modal-trazo-bg')) return;
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
  window.cerrarModalTramo = cerrarModalTramo;
}
export function cerrarModalTramo() {
  const bg = document.getElementById('modal-trazo-bg');
  const modal = document.getElementById('modal-trazo');
  if (bg) bg.remove();
  if (modal) modal.remove();
  // clear global interaction lock if any
  try { window.__interactionLock = false; } catch(e) {}
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

export function abrirModalMarcador(latlng, onSave) {
  if (document.getElementById('modal-marcador-bg')) return;
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
    cerrarModalMarcador();
  };
  // provide a delete button hook if caller provided window.__marcadorOnDelete
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn-cancel';
  deleteBtn.style.marginLeft = '8px';
  deleteBtn.textContent = 'Eliminar';
  deleteBtn.onclick = function() {
    if (typeof window.__marcadorOnDelete === 'function') {
      window.__marcadorOnDelete();
    }
    cerrarModalMarcador();
  };
  // append delete button next to cancel if delete hook exists
  setTimeout(() => {
    const actions = document.querySelector('#modal-marcador .modal-actions');
    if (actions && window.__marcadorOnDelete) actions.appendChild(deleteBtn);
  }, 30);
  window.cerrarModalMarcador = cerrarModalMarcador;
}
export function cerrarModalMarcador() {
  // notify any onClose hook (used to release interaction locks)
  try { if (typeof window.__marcadorOnClose === 'function') window.__marcadorOnClose(); } catch(e) {}
  const bg = document.getElementById('modal-marcador-bg');
  const modal = document.getElementById('modal-marcador');
  if (bg) bg.remove();
  if (modal) modal.remove();
  // clear temporary globals
  window.__marcadorInitial = null;
  window.__marcadorOnClose = null;
  window.__marcadorOnDelete = null;
}


// --- Clase para integración con Leaflet ---
export class TramosMap {
  constructor(map, infoDiv) {
    this.map = map;
    this.infoDiv = infoDiv;
    this.tramos = [];
    this.marcadores = [];
    this._markerLayers = []; // store Leaflet marker instances parallel to marcadores
  this._placingMarker = false;
    this._markerType = 'pin'; // default marker type
  this._interactionLock = false; // when true, prevent other popups/modals from opening
    this.currentPoints = [];
    this.currentLine = null;
    this.lines = [];
    this.drawing = false;
    this._toggleBtn = null;
    this._finishBtn = null;
    this._setupMap();
    this._addControls();
    this._setupGuardarListeners();
    this._renderInfo();
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
  try { window.__marcadorOnClose = () => { this._interactionLock = false; this._updateGuardarButton(); if (this._addMarkerBtn) this._addMarkerBtn.innerText = this._placingMarker ? 'Cancelar marcador' : 'Agregar marcador'; if (this.map && this.map.getContainer) this.map.getContainer().style.cursor = this._placingMarker ? 'crosshair' : ''; }; } catch(e) {}
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
        if (this._addMarkerBtn) this._addMarkerBtn.innerText = this._placingMarker ? 'Cancelar marcador' : 'Agregar marcador';
        if (this.map && this.map.getContainer) this.map.getContainer().style.cursor = this._placingMarker ? 'crosshair' : '';
        return;
      }
  if (!this.drawing) return;
      const { lat, lng } = e.latlng;
      this.currentPoints.push([lat, lng]);
      // redraw current line with fixed points only; preview handled in mousemove
      if (this.currentLine) this.map.removeLayer(this.currentLine);
      if (this.currentPoints.length > 0) {
        this.currentLine = L.polyline(this.currentPoints, { color: '#2563eb', weight: 4 }).addTo(this.map);
      }
      this._updateFinishBtnVisibility();
    });

  // double-click on map ignored for now

    // mousemove preview when drawing
    this.map.on('mousemove', (e) => {
      if (!this.drawing) return;
      if (!this.currentPoints.length) return;
      const latlng = e.latlng;
      const previewPoints = this.currentPoints.concat([[latlng.lat, latlng.lng]]);
      // replace preview line
      if (this._previewLine) this.map.removeLayer(this._previewLine);
      this._previewLine = L.polyline(previewPoints, { color: '#60a5fa', weight: 3, dashArray: '6,4' }).addTo(this.map);
    });
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

  const finish = document.createElement('button');
      finish.type = 'button';
      finish.title = 'Terminar trazo';
      finish.innerText = 'Terminar';
      finish.style.padding = '6px 8px';
      finish.style.background = '#10b981';
      finish.style.color = '#fff';
      finish.style.border = 'none';
      finish.style.borderRadius = '4px';
      finish.style.cursor = 'pointer';
      finish.style.display = 'none';

      toggle.onclick = function(ev) {
        ev.stopPropagation();
        if (!self.drawing) self.enableDrawing(); else self.disableDrawing();
      };
      finish.onclick = function(ev) {
        ev.stopPropagation();
        self.finishTramo();
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
      // Keep a reference for enabling/disabling when interaction lock changes
      self._guardarBtn = guardarBtn;
      container.appendChild(guardarBtn);

      // Prevenir que el control interfiera con el mapa (panning)
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      return container;
    };
    control.addTo(this.map);
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
        markerObj = L.marker([safe.lat, safe.lng], { icon }).addTo(this.map);
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
      markerObj = L.marker([safe.lat, safe.lng], { icon }).addTo(this.map);
    }
    markerObj.bindPopup(`<b>${safe.nombre}</b><br/>${safe.descripcion || ''}`);
    // Persist a plain object (no Leaflet instance) in marcadores
    const plain = { nombre: safe.nombre, descripcion: safe.descripcion, lat: safe.lat, lng: safe.lng, tipo: safe.tipo, createdAt: safe.createdAt };
    this.marcadores.push(plain);
    this._markerLayers.push(markerObj);

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
      // prepare edit: prefill modal and provide delete hook
      window.__marcadorInitial = Object.assign({}, plain);
      window.__marcadorOnDelete = () => {
        // remove marker and data
        const idx = this._markerLayers.indexOf(markerObj);
        if (idx !== -1) {
          this.map.removeLayer(this._markerLayers[idx]);
          this._markerLayers.splice(idx, 1);
          this.marcadores.splice(idx, 1);
          this._renderInfo();
        }
        try { _showToast('Marcador eliminado'); } catch(e) {}
        window.__marcadorOnDelete = null;
        window.__marcadorInitial = null;
        this._interactionLock = false;
        this._updateGuardarButton();
      };
  // set close hook so cancel/delete release locks and UI
  try { window.__marcadorOnClose = () => { this._interactionLock = false; this._updateGuardarButton(); if (this._addMarkerBtn) this._addMarkerBtn.innerText = this._placingMarker ? 'Cancelar marcador' : 'Agregar marcador'; if (this.map && this.map.getContainer) this.map.getContainer().style.cursor = this._placingMarker ? 'crosshair' : ''; }; } catch(e) {}
  abrirModalMarcador({lat: plain.lat, lng: plain.lng}, (nuevo) => {
        // update plain object and popup
        plain.nombre = nuevo.nombre;
        plain.descripcion = nuevo.descripcion;
        plain.lat = nuevo.lat;
        plain.lng = nuevo.lng;
        markerObj.setLatLng([nuevo.lat, nuevo.lng]);
        markerObj.setPopupContent(`<b>${nuevo.nombre}</b><br/>${nuevo.descripcion || ''}`);
        this._renderInfo();
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
    // Finalizar trazo (no abrir modal automáticamente). El trazo queda en lista y en mapa.
    const nuevo = {
      nombre: 'Sin nombre',
      descripcion: '',
      color: '#2563eb',
      distancia: calcularDistancia(this.currentPoints) || 0,
      hilos: 1,
      buffer: 0,
      puntos: this.currentPoints.slice() || []
    };
    this.addTramo(nuevo);
    // Reset estado de dibujo
    if (this.currentLine) {
      this.map.removeLayer(this.currentLine);
      this.currentLine = null;
    }
    this.currentPoints = [];
    if (this._previewLine) { this.map.removeLayer(this._previewLine); this._previewLine = null; }
    this._updateFinishBtnVisibility();
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
      nombre: 'Sin nombre', descripcion: '', color: '#2563eb', distancia: 0, hilos: 1, buffer: 0, puntos: []
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
    poly.on('dblclick', () => {
      if (this._interactionLock) return;
      this._interactionLock = true;
      // prefills via global temp object
      window.__trazoInitial = { ...safe };
      abrirModalTrazo(tramo.puntos, (nuevo) => {
        // actualizar datos en memoria y en la polyline
        const idx = this.tramos.indexOf(tramo);
        if (idx !== -1) this.tramos[idx] = Object.assign({}, nuevo);
        // actualizar polyline color and popup/info
        poly.setStyle({ color: nuevo.color || '#2563eb' });
        this._renderInfo();
  // limpiar
  window.__trazoInitial = null;
  this._interactionLock = false;
  this._updateGuardarButton();
      });
    });
    this.lines.push(poly);
    this.tramos.push(safe);
    this._renderInfo();
  }

  getTramos() {
    // devolver copia segura (no referencias directas)
    return this.tramos.map(t => Object.assign({}, t));
  }

  _renderInfo() {
    if (!this.infoDiv) return;
    const trazosHtml = this.tramos.length ? this.tramos.map((t, i) => `${i+1}. ${t.nombre} (${(t.distancia||0)} km)`).join('<br>') : 'Ninguno';
    const marcadoresHtml = this.marcadores.length ? `<br/><b>Marcadores:</b> ${this.marcadores.length}` : '';
    this.infoDiv.innerHTML = '<b>Trazos guardados:</b><br>' + trazosHtml + marcadoresHtml;
  }
}
