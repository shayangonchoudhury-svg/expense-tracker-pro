const routes = { '/': 'page-landing', '/tracker': 'page-tracker', '/analytics': 'page-analytics', '/vault': 'page-vault' };

export function showPage(id, push = true) {
  // Logic to show/hide pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
  document.getElementById(id).classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function navigate(path, push = true) {
  showPage(routes[path] || routes['/'], push);
}
