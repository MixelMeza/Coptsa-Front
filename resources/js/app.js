import './bootstrap';
import { mountProjectsList } from './components/ProyectsList';
import { mountProjectDetail } from './components/ProjectDetail';

document.addEventListener('DOMContentLoaded', () => {
  const listRoot = document.getElementById('projects-list-root');
  if (listRoot) mountProjectsList(listRoot);

  const detailRoot = document.getElementById('project-detail-root');
  if (detailRoot) {
    const id = detailRoot.dataset.id;
    mountProjectDetail(detailRoot, id);
  }
});