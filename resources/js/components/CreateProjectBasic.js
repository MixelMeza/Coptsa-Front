document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('create-project-map-root');
    if (!root) return;

    root.innerHTML = `
        <div style="margin-bottom:1rem;">
            <label>Nombre del proyecto: <input id="project-name" type="text" class="input" /></label>
        </div>
        <button id="save-project" class="btn">Crear Proyecto</button>
    `;

    document.getElementById('save-project').onclick = async () => {
        const nombre = document.getElementById('project-name').value;
        if (!nombre) {
            alert('Ingrese el nombre del proyecto');
            return;
        }
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ nombre })
            });
            if (res.ok) {
                const data = await res.json();
                alert('Proyecto creado. Ahora puedes agregar trazos.');
                window.location.href = `/projects/${data.id}`;
            } else {
                alert('Error al crear el proyecto');
            }
        } catch (e) {
            alert('Error de red al crear el proyecto');
        }
    };
});

const style = document.createElement('style');
style.innerHTML = `
    .input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
    .btn { padding: 0.5rem 1rem; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    .btn:hover { background: #1d4ed8; }
`;
document.head.appendChild(style);
