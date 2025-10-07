import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

export async function listProyectos() {
  const res = await axios.get(`${API_BASE}/proyectos`);
  return res.data;
}

export async function getProyecto(id) {
  const res = await axios.get(`${API_BASE}/proyectos/${id}`);
  return res.data;
}

export async function updateProyecto(id, proyecto) {
  const res = await axios.put(`${API_BASE}/proyectos/${id}`, proyecto);
  return res.data;
}

export async function deleteProyecto(id) {
  const res = await axios.delete(`${API_BASE}/proyectos/${id}`);
  return res.data;
}
