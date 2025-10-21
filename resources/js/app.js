import './bootstrap';
import { mountProjectsList } from './components/ProyectsList';
import { mountProjectDetail } from './components/ProjectDetail';
// Runtime patch to ensure TramosMap uses existing build icons for markers

document.addEventListener('DOMContentLoaded', () => {
  const listRoot = document.getElementById('projects-list-root');
  if (listRoot) mountProjectsList(listRoot);

  const detailRoot = document.getElementById('project-detail-root');
  if (detailRoot) {
    const id = detailRoot.dataset.id;
  // Note: icon patch removed; TramosMap now uses bundled PNGs directly.
    mountProjectDetail(detailRoot, id);
  }
});