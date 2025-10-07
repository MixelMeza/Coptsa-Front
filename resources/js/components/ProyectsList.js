import { listProyectos, deleteProyecto } from '../api/proyectos';

// Final ProjectsList (same as fixed but with unique name to avoid resolver collisions)
function createCell(text) {
  const td = document.createElement('td');
  td.textContent = text != null ? String(text) : '';
  td.style.padding = '8px 12px';
  td.style.borderBottom = '1px solid #eee';
  td.style.fontSize = '15px';
  return td;
}

function makeTable(items) {
  const table = document.createElement('table');
  table.className = 'projects-table';
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.background = '#fff';
  table.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  [
    'ID', 'Nombre', 'Distancia', 'Estado', 'Fecha creación',
    'Marcadores', 'Rutas', 'Mangas', 'Reservas', 'NAP1', 'NAP2', 'ONT', 'Postes', 'Acciones'
  ].forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    th.style.background = '#f7f7fa';
    th.style.padding = '10px 12px';
    th.style.fontWeight = '600';
    th.style.fontSize = '15px';
    th.style.borderBottom = '2px solid #e0e0e0';
    th.style.textAlign = 'left';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  (items || []).forEach((p, idx) => {
    const tr = document.createElement('tr');
    // Zebra striping
    tr.style.background = idx % 2 === 0 ? '#fff' : '#f9f9fc';
    tr.onmouseover = () => tr.style.background = '#eaf3ff';
    tr.onmouseout = () => tr.style.background = idx % 2 === 0 ? '#fff' : '#f9f9fc';
  tr.appendChild(createCell(p.proyectosID ?? p.id ?? ''));
  tr.appendChild(createCell(p.nombre || ''));
      tr.appendChild(createCell(p.distancia != null ? p.distancia + ' km' : ''));
  // Estado: 1=Activo, 0=Inactivo, otro=texto
      let estadoTxt = '';
      if (p.estado === 1) estadoTxt = 'Activo';
      else if (p.estado === 0) estadoTxt = 'Inactivo';
      else if (typeof p.estado === 'string') estadoTxt = p.estado;
      else estadoTxt = String(p.estado ?? '');
      tr.appendChild(createCell(estadoTxt));
  // Fecha creación: mostrar solo fecha y hora legible
      let fechaTxt = '';
      if (p.fechaCreacion) {
        fechaTxt = String(p.fechaCreacion).replace('T', ' ').substring(0, 16);
      } else if (p.fecha) {
        fechaTxt = String(p.fecha).replace('T', ' ').substring(0, 16);
      }
      tr.appendChild(createCell(fechaTxt));
  tr.appendChild(createCell(p.marcadores != null ? p.marcadores : ''));
  tr.appendChild(createCell(p.rutas != null ? p.rutas : ''));
  tr.appendChild(createCell(p.mangas != null ? p.mangas : ''));
  tr.appendChild(createCell(p.reservas != null ? p.reservas : ''));
  tr.appendChild(createCell(p.nap1 != null ? p.nap1 : ''));
  tr.appendChild(createCell(p.nap2 != null ? p.nap2 : ''));
  tr.appendChild(createCell(p.ont != null ? p.ont : ''));
  tr.appendChild(createCell(p.postes != null ? p.postes : ''));

  const actions = document.createElement('td');
  actions.style.padding = '8px 12px';
  actions.style.borderBottom = '1px solid #eee';
  // Botón Ver
  const viewBtn = document.createElement('button');
  viewBtn.className = 'btn view-btn';
  viewBtn.type = 'button';
  viewBtn.textContent = 'Ver';
  viewBtn.dataset.id = p.proyectosID ?? p.id ?? '';
  viewBtn.style.background = '#2563eb';
  viewBtn.style.color = '#fff';
  viewBtn.style.border = 'none';
  viewBtn.style.borderRadius = '5px';
  viewBtn.style.padding = '6px 14px';
  viewBtn.style.marginRight = '6px';
  viewBtn.style.cursor = 'pointer';
  viewBtn.onmouseover = () => viewBtn.style.background = '#174ea6';
  viewBtn.onmouseout = () => viewBtn.style.background = '#2563eb';
  // Botón Borrar
  const delBtn = document.createElement('button');
  delBtn.className = 'btn delete-btn';
  delBtn.type = 'button';
  delBtn.textContent = 'Borrar';
  delBtn.dataset.id = p.proyectosID ?? p.id ?? '';
  delBtn.style.background = '#ef4444';
  delBtn.style.color = '#fff';
  delBtn.style.border = 'none';
  delBtn.style.borderRadius = '5px';
  delBtn.style.padding = '6px 14px';
  delBtn.style.cursor = 'pointer';
  delBtn.onmouseover = () => delBtn.style.background = '#b91c1c';
  delBtn.onmouseout = () => delBtn.style.background = '#ef4444';
  actions.appendChild(viewBtn);
  actions.appendChild(delBtn);
  tr.appendChild(actions);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

export async function mountProjectsList(root) {
  if (!root) return;
  // Solo limpiar el root una vez
  root.innerHTML = '';
  let proyectos = [];
  let usedMock = false;
  try {
    const apiData = await listProyectos();
    if (Array.isArray(apiData) && apiData.length > 0) {
      proyectos = apiData;
    } else {
      usedMock = true;
      proyectos = [
        {
          proyectosID: 1,
          nombre: 'Proyecto Alpha',
          distancia: 12.5,
          estado: 1,
          fechaCreacion: '2025-10-01',
          marcadores: 5,
          rutas: 2,
          mangas: 1,
          reservas: 0,
          nap1: 3,
          nap2: 2,
          ont: 1,
          postes: 10
        },
        {
          proyectosID: 2,
          nombre: 'Proyecto Beta',
          distancia: 8.0,
          estado: 0,
          fechaCreacion: '2025-09-15',
          marcadores: 2,
          rutas: 1,
          mangas: 2,
          reservas: 1,
          nap1: 1,
          nap2: 1,
          ont: 2,
          postes: 5
        },
        {
          proyectosID: 3,
          nombre: 'Proyecto Gamma',
          distancia: 0.0,
          estado: 1,
          fechaCreacion: '2025-10-07',
          marcadores: 0,
          rutas: 0,
          mangas: 0,
          reservas: 0,
          nap1: 0,
          nap2: 0,
          ont: 0,
          postes: 0
        }
      ];
    }
  } catch (err) {
    usedMock = true;
    proyectos = [
      {
        proyectosID: 1,
        nombre: 'Proyecto Alpha',
        distancia: 12.5,
        estado: 1,
        fechaCreacion: '2025-10-01',
        marcadores: 5,
        rutas: 2,
        mangas: 1,
        reservas: 0,
        nap1: 3,
        nap2: 2,
        ont: 1,
        postes: 10
      },
      {
        proyectosID: 2,
        nombre: 'Proyecto Beta',
        distancia: 8.0,
        estado: 0,
        fechaCreacion: '2025-09-15',
        marcadores: 2,
        rutas: 1,
        mangas: 2,
        reservas: 1,
        nap1: 1,
        nap2: 1,
        ont: 2,
        postes: 5
      },
      {
        proyectosID: 3,
        nombre: 'Proyecto Gamma',
        distancia: 0.0,
        estado: 1,
        fechaCreacion: '2025-10-07',
        marcadores: 0,
        rutas: 0,
        mangas: 0,
        reservas: 0,
        nap1: 0,
        nap2: 0,
        ont: 0,
        postes: 0
      }
    ];
  }
  if (usedMock) {
    const b = document.createElement('div');
    b.className = 'mock-banner';
    b.textContent = 'No se pudo contactar la API o no hay datos. Mostrando datos simulados.';
    root.appendChild(b);
  }
  const search = document.createElement('input');
  search.id = 'projects-search';
  search.placeholder = 'Buscar por nombre o ID';
  search.style.display = 'block';
  search.style.marginBottom = '8px';
  root.appendChild(search);
  let current = proyectos.slice();
  let table = makeTable(current);
  root.appendChild(table);

  function refreshTable(newItems) {
    const newTable = makeTable(newItems);
    root.replaceChild(newTable, table);
    table = newTable;
    attachListeners();
  }

  function attachListeners() {
    table.querySelectorAll('.view-btn').forEach(btn => {
      btn.removeEventListener('click', onView);
      btn.addEventListener('click', onView);
    });
    table.querySelectorAll('.delete-btn').forEach(btn => {
      btn.removeEventListener('click', onDelete);
      btn.addEventListener('click', onDelete);
    });
  }

  function onView(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    window.location.href = '/projects/' + encodeURIComponent(id);
  }

  async function onDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    if (usedMock) { alert('Operación deshabilitada en datos simulados'); return; }
    if (!confirm('Confirma borrar proyecto ' + id + '?')) return;
    try {
      await deleteProyecto(id);
      current = current.filter(p => String(p.proyectosID ?? p.id) !== String(id));
      refreshTable(current);
    } catch (err) {
      alert('Error borrando: ' + (err && err.message ? err.message : 'error'));
    }
  }

  let debounce = null;
  search.addEventListener('input', (e) => {
    const q = String(e.target.value || '').trim().toLowerCase();
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (!q) current = proyectos.slice();
      else current = proyectos.filter(p => {
        const nombre = String(p.nombre || '').toLowerCase();
        const id = String(p.proyectosID ?? p.id ?? '');
        return nombre.includes(q) || id.includes(q);
      });
      refreshTable(current);
    }, 200);
  });

  attachListeners();
}
