import { getProyecto, updateProyecto, updateTrazado } from '../api/proyectos';

async function loadLeaflet() {
  if (window.L) return window.L;
  // load CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
  // load script
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => resolve();
    s.onerror = reject;
    document.body.appendChild(s);
  });

  // 🟢 NUEVO: librería Leaflet Draw
  const drawCss = document.createElement('link');
  drawCss.rel = 'stylesheet';
  drawCss.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css';
  document.head.appendChild(drawCss);

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js';
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
  return window.L;
}

export async function mountProjectDetail(root, id) {
  root.innerHTML = '<div class="p-4 bg-white rounded shadow">Cargando proyecto...</div>';
  try {
    const proyecto = await getProyecto(id);
    const container = document.createElement('div');
    container.className = 'grid grid-cols-1 lg:grid-cols-3 gap-4';

    const meta = document.createElement('div');
    meta.className = 'col-span-1 p-4 bg-white rounded shadow';
    meta.innerHTML = `
      <h2 class="font-medium mb-2">${proyecto.nombre || ''}</h2>
      <div><strong>ID:</strong> ${proyecto.proyectosID}</div>
      <div><strong>Distancia:</strong> ${proyecto.distancia ?? ''}</div>
      <div><strong>Marcadores:</strong> ${proyecto.marcadores ?? 0}</div>
      <div class="mt-4 space-y-2">
      <div>
        <button id="save-proyecto" class="px-3 py-1 bg-green-600 text-white rounded w-full">Guardar</button>
      </div>
      <div>
        <button id="draw-trazado" class="px-3 py-1 bg-blue-600 text-white rounded w-full">Dibujar</button>
      </div>
      </div>
    `;

    const mapWrap = document.createElement('div');
    mapWrap.className = 'col-span-2 p-4 bg-white rounded shadow';
    mapWrap.innerHTML = `<div id="map" style="height:500px"></div>`;

    container.appendChild(meta);
    container.appendChild(mapWrap);
    root.innerHTML = '';
    root.appendChild(container);

    const L = await loadLeaflet();
    const map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM' }).addTo(map);
    //
    // --- Control de dibujo ---
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon: true,
        polyline: true,
        circle: false,
        marker: false,
        rectangle: false
      }
    });

    // ✅ Ahora sí: agregar el listener al botón
    const drawBtn = document.getElementById('draw-trazado');
    drawBtn.addEventListener('click', () => {
      map.addControl(drawControl);
      alert('Modo dibujo activado. Usa las herramientas del mapa para trazar.');
    });


    // Cuando el usuario crea un trazado
    map.on(L.Draw.Event.CREATED, async function (event) {
    const layer = event.layer;
    drawnItems.addLayer(layer);

    // Combinar todos los trazados en uno solo
    const allGeoJson = {
      type: "FeatureCollection",
      features: drawnItems.getLayers().map(l => l.toGeoJSON())
    };

    try {
      await updateTrazado(proyecto.proyectosID, allGeoJson);
      alert('Trazado guardado correctamente');
    } catch (err) {
      alert('Error al guardar trazado: ' + (err.response?.data?.message || err.message));
    }
  });

    //
    let geojson = proyecto.json;
    if (geojson && geojson.type) {
      const layer = L.geoJSON(geojson).addTo(map);
      layer.addTo(drawnItems); // para que forme parte de los layers editables
      layer.addTo(map); // Agregar la capa al mapa
      try {
        const bounds = layer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds);
      } catch (e) {
        // fallback
      }
    } else {
      const info = document.createElement('div');
      info.className = 'p-2 text-sm text-gray-600';
      info.textContent = 'Sin geometría disponible';
      mapWrap.appendChild(info);
    }

    document.getElementById('save-proyecto').addEventListener('click', async () => {
      try {
        // For now only saving metadata changes; editing geometry via draw is not implemented
        const updated = { ...proyecto };
        await updateProyecto(proyecto.proyectosID, updated);
        alert('Guardado ok');
      } catch (err) {
        alert('Error guardando: ' + (err.response?.data?.message || err.message));
      }
    });

  } catch (err) {
    root.innerHTML = `<div class="p-4 bg-red-100 text-red-800 rounded">Error: ${err.message}</div>`;
  }
}
