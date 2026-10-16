(() => {
  const cacheName = 'night-atlas-offline-v2';
  const badge = document.createElement('div');
  badge.className = 'offline-ready-status';
  badge.setAttribute('role', 'status');
  badge.setAttribute('aria-live', 'polite');
  document.body.appendChild(badge);

  const show = (message, state) => {
    badge.textContent = message;
    badge.dataset.state = state;
  };

  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    show('Для офлайн-режима откройте сайт в Safari или Chrome', 'error');
    return;
  }

  show('↓ Сохраняем ёкаев, иллюстрации и звук для офлайна…', 'loading');
  navigator.serviceWorker.register('./sw.js', {scope: './'})
    .then(() => navigator.serviceWorker.ready)
    .then(async () => {
      if (!(await caches.has(cacheName))) {
        throw new Error('Офлайн-набор ещё не сохранён');
      }
      const refresh = () => show(
        navigator.onLine ? '✓ Готово без интернета — можно в путь!' : '✦ Атлас работает без интернета',
        'ready'
      );
      refresh();
      window.addEventListener('online', refresh);
      window.addEventListener('offline', refresh);
    })
    .catch(() => {
      show('Не удалось сохранить офлайн-версию. Обновите страницу при хорошем интернете.', 'error');
    });
})();
