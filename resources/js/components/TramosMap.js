import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
}


// --- Clase para integración con Leaflet ---
export class TramosMap {
  constructor(map, infoDiv) {
    this.map = map;
    this.infoDiv = infoDiv;
    this.tramos = [];
    this.currentPoints = [];
    this.currentLine = null;
    this.lines = [];
    this.drawing = false;
    this._toggleBtn = null;
    this._finishBtn = null;
    this._setupMap();
    this._addControls();
    this._renderInfo();
  }

  _setupMap() {
    // Click-to-add: when drawing, clicks add fixed points; mousemove shows preview
    this.map.on('click', (e) => {
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

      // Guardamos referencias para actualizaciones desde la instancia
      self._toggleBtn = toggle;
      self._finishBtn = finish;

      // Prevenir que el control interfiera con el mapa (panning)
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.disableScrollPropagation(container);
      return container;
    };
    control.addTo(this.map);
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
      // prefills via global temp object
      window.__trazoInitial = { ...safe };
      abrirModalTrazo(tramo.puntos, (nuevo) => {
        // actualizar datos en memoria y en la polyline
        const idx = this.tramos.indexOf(tramo);
        if (idx !== -1) this.tramos[idx] = Object.assign({}, nuevo);
        // actualizar polyline color y popup/info
        poly.setStyle({ color: nuevo.color || '#2563eb' });
        this._renderInfo();
        // limpiar
        window.__trazoInitial = null;
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
    this.infoDiv.innerHTML = '<b>Trazos guardados:</b><br>' +
      (this.tramos.length ? this.tramos.map((t, i) => `${i+1}. ${t.nombre} (${(t.distancia||0)} km)`).join('<br>') : 'Ninguno');
  }
}
