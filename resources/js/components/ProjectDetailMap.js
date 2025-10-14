import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TramosMap, calcularDistancia } from './TramosMap.js';
import { createProyecto, updateTrazado, getProyecto } from '../api/proyectos.js';

// Inicialización del mapa y UI para crear/editar proyectos
document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('project-detail-map-root');
    if (!root) return;

    const isCreate = root.dataset.id === 'new';
    let nombre = '';
    let tramos = [];

    if (!isCreate) {
        try {
            // usar el API backend existente
            const data = await getProyecto(root.dataset.id);
            if (data) {
                nombre = data.nombre || '';
                // backend puede devolver el JSON en la propiedad 'json' o 'trazos'
                if (Array.isArray(data.trazos)) tramos = data.trazos;
                else if (data.json && data.json.trazos) tramos = data.json.trazos;
                else if (Array.isArray(data.tramos)) tramos = data.tramos;
            }
        } catch (e) {
            console.error('Error cargando proyecto', e);
        }
    }

    root.innerHTML = `
        <div style="margin-bottom:1rem;">
            <label>Nombre del proyecto: <input id="project-name" type="text" class="input" value="${nombre}" ${isCreate ? '' : 'disabled'} /></label>
        </div>
        <div id="map" style="height:520px; margin-bottom:1rem;"></div>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px;">
            <button id="save-tramos" class="btn">${isCreate ? 'Crear Proyecto y Trazos' : 'Guardar Trazos'}</button>
            <span style="color:#666;font-size:14px;">Haz click para añadir puntos. Mueve el cursor para ver una previsualización del segmento. Pulsa "Terminar" para finalizar el trazo. Haz click en un trazo para editar sus datos. Puedes crear varios trazos sin guardar; guarda todo cuando estés listo.</span>
        </div>
        <div id="tramos-info"></div>
    `;

    const map = L.map('map', { doubleClickZoom: false }).setView([-12.0464, -77.0428], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const tramosMap = new TramosMap(map, document.getElementById('tramos-info'));
    if (Array.isArray(tramos) && tramos.length) tramos.forEach(t => tramosMap.addTramo(t));

    function computeProjectSummary(tramosList) {
            const total_tramos = Array.isArray(tramosList) ? tramosList.length : 0;
            let total_distancia = 0;
            let total_puntos = 0;
            for (const t of (tramosList || [])) {
                if (t && typeof t.distancia === 'number' && !Number.isNaN(t.distancia)) {
                    total_distancia += t.distancia || 0;
                } else if (t && Array.isArray(t.puntos)) {
                    // calcular distancia si no viene
                    try {
                        total_distancia += calcularDistancia(t.puntos) || 0;
                    } catch (e) {
                        total_distancia += 0;
                    }
                }
                if (t && Array.isArray(t.puntos)) total_puntos += t.puntos.length || 0;
            }
            const total_distancia_km = Number((total_distancia || 0).toFixed(3));
            return {
                total_tramos: total_tramos || 0,
                total_distancia_km: Number.isFinite(total_distancia_km) ? total_distancia_km : 0,
                total_puntos: total_puntos || 0
            };
    }

    document.getElementById('save-tramos').onclick = async () => {
        const btn = document.getElementById('save-tramos');
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = 'Guardando...';

        const nuevosTramos = tramosMap.getTramos();
        // asegurarnos de que cada tramo tenga su distancia calculada antes de enviar
        const enhancedTramos = (nuevosTramos || []).map(t => {
            const copia = Object.assign({}, t);
            if (typeof copia.distancia !== 'number') {
                try {
                    copia.distancia = calcularDistancia(copia.puntos || []);
                } catch (e) {
                    copia.distancia = 0;
                }
            }
            return copia;
        });

        const summary = computeProjectSummary(enhancedTramos);
        if (isCreate) {
            const nombreVal = document.getElementById('project-name').value.trim();
            if (!nombreVal) {
                btn.disabled = false;
                btn.innerText = originalText;
                return alert('Ingrese el nombre del proyecto');
            }
            try {
                // Crear proyecto en backend (tu endpoint POST /api/proyectos)
                const payload = {
                    nombre: nombreVal,
                    json: { trazos: enhancedTramos },
                    summary,
                    distancia: summary.total_distancia_km || 0,
                    rutas: summary.total_tramos || 0,
                    marcadores: summary.total_puntos || 0
                };
                const data = await createProyecto(payload);
                if (data) {
                    alert('Proyecto creado correctamente');
                    // buscar id en varias propiedades posibles que el backend pueda devolver
                    const newId = data.proyectosID || data.proyectosId || data.id || data.proyectoID || data.idProyecto || (data.proyecto && data.proyecto.proyectosID);
                    if (newId) {
                        window.location.href = `/projects/${newId}`;
                        return; // redirige
                    } else {
                        // si no viene id, navegar a listado
                        window.location.href = '/projects';
                        return;
                    }
                }
            } catch (e) {
                console.error('Create project failed', e);
                alert('Error al crear el proyecto: ' + (e.message || e));
            } finally {
                // si no redirigimos, re-habilitar
                btn.disabled = false;
                btn.innerText = originalText;
            }
        } else {
            try {
                // Llamar al endpoint PUT /api/proyectos/{id}/trazado que definiste
                // enviar trazos en top-level para que el servicio los encuentre como "trazos"
                const payload = {
                    trazos: enhancedTramos,
                    summary,
                    distancia: summary.total_distancia_km || 0,
                    rutas: summary.total_tramos || 0,
                    marcadores: summary.total_puntos || 0
                };
                const data = await updateTrazado(root.dataset.id, payload);
                if (data) {
                    alert('Trazos guardados correctamente');
                    window.location.reload();
                    return;
                }
            } catch (e) {
                console.error('Save trazado failed', e);
                alert('Error al guardar los trazos: ' + (e.message || e));
            } finally {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        }
    };
});

// Estilos básicos
const style = document.createElement('style');
style.innerHTML = `
    .input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .btn { padding: 0.5rem 1rem; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    .btn:hover { background: #1d4ed8; }
`;
document.head.appendChild(style);

