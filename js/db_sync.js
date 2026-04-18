(function () {
  const API_BASE = 'http://localhost:5050';
  const SYNC_ENDPOINT = API_BASE + '/api/data';
  const STORAGE_KEYS = ['customers', 'items', 'transactions', 'payments'];
  const META_KEY = '__tk_last_sync';
  const DIRTY_KEY = '__tk_local_dirty_at';
  const SYNC_INTERVAL_MS = 15000;

  let syncInFlight = false;
  let suppressDirtyMark = false;

  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  function markDirtyNow() {
    if (suppressDirtyMark) {
      return;
    }
    originalSetItem(DIRTY_KEY, new Date().toISOString());
  }

  // Track local changes for conflict resolution across devices.
  localStorage.setItem = function (key, value) {
    originalSetItem(key, value);
    if (STORAGE_KEYS.includes(key)) {
      markDirtyNow();
    }
  };

  localStorage.removeItem = function (key) {
    originalRemoveItem(key);
    if (STORAGE_KEYS.includes(key)) {
      markDirtyNow();
    }
  };

  function parseStoredValue(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function getLocalData() {
    return {
      customers: parseStoredValue(localStorage.getItem('customers') || '[]', []),
      items: parseStoredValue(localStorage.getItem('items') || '[]', []),
      transactions: parseStoredValue(localStorage.getItem('transactions') || '{}', {}),
      payments: parseStoredValue(localStorage.getItem('payments') || '{}', {})
    };
  }

  function hasData(dataset) {
    if (!dataset || typeof dataset !== 'object') {
      return false;
    }

    return STORAGE_KEYS.some((key) => {
      const value = dataset[key];
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (value && typeof value === 'object') {
        return Object.keys(value).length > 0;
      }
      return false;
    });
  }

  function applyServerData(dataset) {
    if (!dataset || typeof dataset !== 'object') {
      return;
    }

    suppressDirtyMark = true;
    STORAGE_KEYS.forEach((key) => {
      if (dataset[key] !== undefined) {
        originalSetItem(key, JSON.stringify(dataset[key]));
      }
    });
    suppressDirtyMark = false;
  }

  function toTimestamp(value) {
    if (!value) {
      return 0;
    }
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : 0;
  }

  function stableStringify(value) {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return '[' + value.map((item) => stableStringify(item)).join(',') + ']';
    }

    const keys = Object.keys(value).sort();
    return '{' + keys.map((key) => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
  }

  async function request(method, body) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(SYNC_ENDPOINT, options);
    if (!response.ok) {
      throw new Error('Sync request failed: ' + response.status);
    }

    return response.json();
  }

  async function syncNow() {
    if (syncInFlight) {
      return;
    }

    syncInFlight = true;

    try {
      const localData = getLocalData();
      const localHasData = hasData(localData);

      let serverPayload = null;
      let serverSavedAt = null;
      try {
        const fetched = await request('GET');
        serverPayload = fetched && fetched.data ? fetched.data : null;
        serverSavedAt = fetched && fetched.savedAt ? fetched.savedAt : null;
      } catch (error) {
        syncInFlight = false;
        return;
      }

      const serverHasData = hasData(serverPayload);
      const localDirtyAt = localStorage.getItem(DIRTY_KEY);
      const localDirtyTs = toTimestamp(localDirtyAt);
      const serverSavedTs = toTimestamp(serverSavedAt);

      if (!localHasData && serverHasData) {
        applyServerData(serverPayload);
        originalRemoveItem(DIRTY_KEY);
      } else if (localHasData && !serverHasData) {
        await request('POST', localData);
        originalRemoveItem(DIRTY_KEY);
      } else if (localHasData) {
        const localSig = stableStringify(localData);
        const serverSig = stableStringify(serverPayload || {});

        if (localSig === serverSig) {
          originalRemoveItem(DIRTY_KEY);
        } else if (localDirtyTs > serverSavedTs) {
          await request('POST', localData);
          originalRemoveItem(DIRTY_KEY);
        } else {
          applyServerData(serverPayload);
          originalRemoveItem(DIRTY_KEY);
        }
      }

      originalSetItem(META_KEY, new Date().toISOString());
    } catch (error) {
      // Ignore sync errors so core UI remains usable in offline/local-only mode.
      console.warn('DB sync skipped:', error.message);
    } finally {
      syncInFlight = false;
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    syncNow();
    setInterval(syncNow, SYNC_INTERVAL_MS);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      syncNow();
    }
  });
})();
