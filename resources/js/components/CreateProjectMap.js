import L from 'leaflet';
import { TramosMap } from './TramosMap.js';

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('create-project-map-root');
    if (!root) return;

    root.innerHTML = `
        <div style="margin-bottom:1rem;">
            <label>Nombre del proyecto: <input id="project-name" type="text" class="input" /></label>
        </div>
        <div id="map" style="height:400px; margin-bottom:1rem;"></div>
        <button id="save-project" class="btn">Guardar Proyecto</button>
        <div id="tramos-info"></div>
    `;

    // Inicializar mapa
    const map = L.map('map').setView([-12.0464, -77.0428], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Inicializar tramos
    const tramosMap = new TramosMap(map, document.getElementById('tramos-info'));

    document.getElementById('save-project').onclick = async () => {
        const nombre = document.getElementById('project-name').value;
        if (!nombre) {
            alert('Ingrese el nombre del proyecto');
            return;
        }
        const tramos = tramosMap.getTramos();
        if (tramos.length === 0) {
            alert('Dibuja al menos un tramo en el mapa');
            return;
        }
        // Aquí puedes hacer el POST al backend
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ nombre, tramos })
            });
            if (res.ok) {
                alert('Proyecto guardado correctamente');
                window.location.href = '/';
            } else {
                alert('Error al guardar el proyecto');
            }
        } catch (e) {
            alert('Error de red al guardar el proyecto');
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
