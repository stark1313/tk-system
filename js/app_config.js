(function () {
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isRenderHost = /(^|\.)onrender\.com$/i.test(window.location.hostname);
  const currentOrigin = window.location.origin;
  const storedApiBase = window.localStorage.getItem('tk_api_base');

  function isLocalAddress(url) {
    if (!url) {
      return false;
    }

    try {
      const hostname = new URL(url).hostname;
      return hostname === 'localhost' || hostname === '127.0.0.1';
    } catch (error) {
      return /localhost|127\.0\.0\.1/.test(String(url));
    }
  }

  let fallbackApiBase;
  if (isLocalHost) {
    fallbackApiBase = 'http://localhost:5050';
  } else if (isRenderHost) {
    // When frontend is served by Render, use same-origin API by default.
    fallbackApiBase = currentOrigin;
  } else {
    // For other static hosts (e.g. GitHub Pages), call the Render API origin.
    fallbackApiBase = 'https://tk-system.onrender.com';
  }

  let apiBase = storedApiBase || fallbackApiBase;

  // Ignore stale localhost override on mobile/remote devices.
  if (!isLocalHost && isLocalAddress(apiBase)) {
    apiBase = fallbackApiBase;
    window.localStorage.setItem('tk_api_base', apiBase);
  }

  window.TK_CONFIG = Object.assign(
    {
      API_BASE: apiBase,
    },
    window.TK_CONFIG || {}
  );
})();
