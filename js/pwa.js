// PWA — Service Worker e banner de instalação

/* Registrar Service Worker */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}

/* Banner de instalação */
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferredPrompt = e;

  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.remove('hidden');
});

document.addEventListener('DOMContentLoaded', function () {
  const btnInstall = document.getElementById('pwa-btn-install');
  const btnClose   = document.getElementById('pwa-btn-close');
  const banner     = document.getElementById('pwa-install-banner');

  if (btnInstall) {
    btnInstall.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        if (banner) banner.classList.add('hidden');
      });
    });
  }

  if (btnClose) {
    btnClose.addEventListener('click', function () {
      if (banner) banner.classList.add('hidden');
    });
  }
});

window.addEventListener('appinstalled', function () {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.add('hidden');
  deferredPrompt = null;
});

/* Suporte a deep-links via hash (#agua, #esgoto, #drenagem, #projeto) */
(function () {
  function rotearHash() {
    const hash = window.location.hash.replace('#', '');
    const abas = ['projeto', 'agua', 'esgoto', 'drenagem'];
    if (abas.includes(hash) && typeof switchTab === 'function') {
      switchTab(hash);
    }
  }

  window.addEventListener('hashchange', rotearHash);
  document.addEventListener('DOMContentLoaded', function () {
    if (window.location.hash) rotearHash();
  });
})();
