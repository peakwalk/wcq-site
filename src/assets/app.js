(() => {
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  const isLocalHost = localHosts.has(window.location.hostname);
  const cachePrefix = 'well-control-site-';

  async function clearLocalServiceWorkers() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(cachePrefix))
          .map((cacheName) => caches.delete(cacheName)),
      );
    }
  }

  function registerProductionServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }

  window.addEventListener('load', () => {
    if (isLocalHost) {
      clearLocalServiceWorkers().catch(() => {});
      return;
    }

    registerProductionServiceWorker();
  });
})();
