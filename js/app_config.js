(function () {
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const storedApiBase = window.localStorage.getItem('tk_api_base');

  // GitHub Pages uses the public Render API; local dev keeps localhost.
  const defaultApiBase = storedApiBase || (isLocalHost
    ? 'http://localhost:5050'
    : 'https://tk-system-api.onrender.com');

  window.TK_CONFIG = Object.assign(
    {
      API_BASE: defaultApiBase,
    },
    window.TK_CONFIG || {}
  );
})();
