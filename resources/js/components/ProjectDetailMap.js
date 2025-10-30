// Calcula el resumen de entidades (trazos, cajas, mufas, onts) a partir de los arrays
// Calcula el resumen de entidades (trazos, cajas, mufas, mangas, nap1, reservas, postes) a partir de los arrays
function calcularResumenProyecto(trazos, marcadores) {
    let cajas = 0, mufas = 0, mangas = 0, nap1 = 0, reservas = 0, postes = 0;
    if (Array.isArray(marcadores)) {
        marcadores.forEach(m => {
            const tipo = (m.type || m.tipo || '').toLowerCase();
            // Mapear tipos de marcador a entidades de negocio
            switch (tipo) {
                case 'caja':
                    cajas++;
                    break;
                case 'mufa':
                    mufas++;
                    break;
                case 'pin':
                    mangas++;
                    break;
                case 'flag':
                    nap1++;
                    reservas++;
                    break;
                case 'star':
                    reservas++;
                    break;
                case 'poste':
                    postes++;
                    break;
                default:
                    break;
            }
        });
    }
    return {
        cajas,
        mufas,
        mangas,
        nap1,
        reservas,
        postes,
        trazos: Array.isArray(trazos) ? trazos.length : 0
    };
}
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TramosMap, calcularDistancia } from './TramosMap.js';
import { createProyecto, updateTrazado, updateProyecto, getProyecto } from '../api/proyectos.js';

// Inicialización del mapa y UI para crear/editar proyectos
document.addEventListener('DOMContentLoaded', async () => {
    const root = document.getElementById('project-detail-map-root');
    if (!root) return;

    const isCreate = root.dataset.id === 'new';
    let nombre = '';
    let tramos = [];
    let marcadores = [];

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
                // markers: backend may return 'marcadores' at top-level or inside data.json
                if (Array.isArray(data.marcadores)) marcadores = data.marcadores;
                else if (data.json && Array.isArray(data.json.marcadores)) marcadores = data.json.marcadores;
                else if (Array.isArray(data.markers)) marcadores = data.markers; // fallback english
            }
        } catch (e) {
            console.error('Error cargando proyecto', e);
        }
    }

    root.innerHTML = `
        <div style="margin-bottom:1rem;">
            <label>Nombre del proyecto: <input id="project-name" type="text" class="input" value="${nombre}" /></label>
        </div>
        <div id="map" style="height:520px; margin-bottom:1rem;"></div>
        <div id="project-summary" style="margin-bottom:12px;color:#333;font-size:14px;"></div>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px;">
            <span style="color:#666;font-size:14px;">Usa el botón "Guardar todo" en el mapa para persistir trazos y marcadores.</span>
        </div>
        <div id="tramos-info"></div>
    `;

    const map = L.map('map', { doubleClickZoom: false }).setView([-12.0464, -77.0428], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const tramosMap = new TramosMap(map, document.getElementById('tramos-info'));
    if (Array.isArray(tramos) && tramos.length) tramos.forEach(t => tramosMap.addTramo(t));
    // Cargar marcadores iniciales (si vienen del backend)
    try {
        if (Array.isArray(marcadores) && marcadores.length) {
            console.debug('Cargando marcadores iniciales:', marcadores);
            marcadores.forEach(m => {
                // Normalizar posibles claves en distintos idiomas/formatos
                const norm = {
                    nombre: m.name || m.nombre || '',
                    descripcion: m.description || m.descripcion || '',
                    lat: Number(m.lat ?? m.latitude ?? 0),
                    lng: Number(m.lng ?? m.lon ?? m.longitude ?? 0),
                    tipo: m.type || m.tipo || 'pin',
                    createdAt: m.createdAt || m.created_at || new Date().toISOString()
                };
                // Sólo agregar si lat/lng parecen válidos
                if (!Number.isFinite(norm.lat) || !Number.isFinite(norm.lng) || (norm.lat === 0 && norm.lng === 0)) {
                    console.warn('Marcador omitido por lat/lng inválidos:', m);
                    return;
                }
                tramosMap.addMarker(norm);
            });
        }
    } catch (e) {
        console.error('Error cargando marcadores iniciales', e);
    }

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

    // Expose a save handler that can be triggered by the map control via CustomEvent 'tramos:save'
    async function performSave() {
        // dispatch event to inform UI we're saving
        document.dispatchEvent(new CustomEvent('tramos:saving'));
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
        const marcadores = tramosMap.getMarkers ? tramosMap.getMarkers() : [];
        // DEBUG: log what we are sending so we can verify markers exist
        try { console.debug('Saving payload: tramos=', nuevosTramos, 'marcadores=', marcadores); } catch(e) {}
        // Normalize marker objects to expected shape
        const normalizedMarkers = (Array.isArray(marcadores) ? marcadores : []).map(m => ({
            type: m.tipo || m.type || 'pin',
            name: m.nombre || m.name || '',
            description: m.descripcion || m.description || '',
            lat: Number(m.lat) || 0,
            lng: Number(m.lng) || 0,
            createdAt: m.createdAt || new Date().toISOString()
        }));
        const marcadoresCount = normalizedMarkers.length;
        // Calcular y guardar resumen de entidades
        const resumenEntidades = calcularResumenProyecto(enhancedTramos, normalizedMarkers);
        // Asignar resumen a variables principales para la BD
        const resumenVars = {
            marcadores: marcadoresCount || 0,
            rutas: summary.total_tramos || 0,
            distancia: summary.total_distancia_km || 0,
            cajas: resumenEntidades.cajas || 0,
            mufas: resumenEntidades.mufas || 0,
            mangas: resumenEntidades.mangas || 0,
            nap1: resumenEntidades.nap1 || 0,
            reservas: resumenEntidades.reservas || 0,
            postes: resumenEntidades.postes || 0,
            trazos: resumenEntidades.trazos || 0
        };
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
                json: {
                    trazos: enhancedTramos,
                    marcadores: normalizedMarkers,
                    resumen: resumenEntidades
                },
                summary,
                ...resumenVars
            };
            const data = await createProyecto(payload);
            if (data) {
                alert('Proyecto creado correctamente');
                // notify UI that save finished successfully
                document.dispatchEvent(new CustomEvent('tramos:saved', { detail: { success: true } }));
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
            // dispatch saved/failed event to notify UI
            document.dispatchEvent(new CustomEvent('tramos:saved', { detail: { success: false } }));
        }
    } else {
        try {
            // Llamar al endpoint PUT /api/proyectos/{id}/trazado que definiste
            // enviar trazos en top-level para que el servicio los encuentre como "trazos"
            const payload = {
                trazos: enhancedTramos,
                marcadores: normalizedMarkers,
                resumen: resumenEntidades,
                summary,
                ...resumenVars
            };
            // Use updateProyecto to persist both top-level fields and the JSON payload
            // so the backend saves the `json` column and summary fields in the DB.
            // Tomar el nombre actualizado del input
            const nombreVal = document.getElementById('project-name').value.trim();
            const updatePayload = {
                nombre: nombreVal,
                json: {
                    trazos: enhancedTramos,
                    marcadores: normalizedMarkers,
                    resumen: resumenEntidades
                },
                ...resumenVars
            };
            const data = await updateProyecto(root.dataset.id, updatePayload);
            if (data) {
                // Also call trazado endpoint if your backend uses a separate route to persist geometry
                try {
                    const trazadoPayload = {
                        trazos: enhancedTramos,
                        marcadores: normalizedMarkers,
                        resumen: resumenEntidades
                    };
                    await updateTrazado(root.dataset.id, trazadoPayload);
                } catch (errT) {
                    console.warn('updateTrazado failed (non-fatal):', errT);
                }
                alert('Trazos guardados correctamente');
                // inform UI and then reload
                document.dispatchEvent(new CustomEvent('tramos:saved', { detail: { success: true } }));
                window.location.reload();
                return;
            }
        } catch (e) {
            console.error('Save trazado failed', e);
            alert('Error al guardar los trazos: ' + (e.message || e));
        } finally {
            document.dispatchEvent(new CustomEvent('tramos:saved', { detail: { success: false } }));
        }
    }

    // Live update handler: update summary UI and keep latest resumen available
    let latestResumen = null;
    function updateLiveSummary(tramosArr, marcadoresArr) {
        try {
            const computed = computeProjectSummary(tramosArr || []);
            const resumenEnt = calcularResumenProyecto(tramosArr || [], marcadoresArr || []);
            latestResumen = Object.assign({}, resumenEnt, {
                distancia: computed.total_distancia_km || 0,
                rutas: computed.total_tramos || 0,
                marcadores: Array.isArray(marcadoresArr) ? marcadoresArr.length : 0
            });
            const el = document.getElementById('project-summary');
            if (el) {
                el.innerHTML = `<b>Resumen:</b> Tramos: ${latestResumen.trazos || 0} | Rutas: ${latestResumen.rutas || 0} | Distancia: ${latestResumen.distancia || 0} km | Marcadores: ${latestResumen.marcadores || 0} | Cajas: ${latestResumen.cajas || 0} | Mufas: ${latestResumen.mufas || 0} | Mangas: ${latestResumen.mangas || 0} | NAP1: ${latestResumen.nap1 || 0} | Reservas: ${latestResumen.reservas || 0} | Postes: ${latestResumen.postes || 0}`;
            }
        } catch (e) { console.warn('updateLiveSummary error', e); }
    }

    // Listen for changes emitted by TramosMap
    document.addEventListener('tramos:changed', (ev) => {
        const detail = ev && ev.detail ? ev.detail : {};
        updateLiveSummary(detail.tramos || [], detail.marcadores || []);
    });

    // Initialize live summary with any data we already loaded
    try { updateLiveSummary(tramos, marcadores); } catch(e) {}
    }

    // Listen for external save triggers from the map (button dispatches 'tramos:save')
    document.addEventListener('tramos:save', (e) => {
        performSave();
    });
});

// Estilos básicos
const style = document.createElement('style');
style.innerHTML = `
    .input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .btn { padding: 0.5rem 1rem; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    .btn:hover { background: #1d4ed8; }
`;
document.head.appendChild(style);

