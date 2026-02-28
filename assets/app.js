(function () {
  const APP_VERSION = '1.0.0';

  const API = {
    services: 'api/services.php',
    control: 'api/control.php',
    system: 'api/system.php'
  };

  const SYSTEM_REFRESH_MS = 60000;

  function el(id) {
    return document.getElementById(id);
  }

  function setContent(id, html) {
    const node = el(id);
    if (node) node.innerHTML = html;
  }

  function fetchJson(url, options) {
    return fetch(url, { credentials: 'same-origin', ...options })
      .then(function (r) {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      });
  }

  function renderSystem(data) {
    if (data.error) {
      return '<p class="error-msg">' + escapeHtml(data.error) + '</p>';
    }
    const m = data.memory || {};
    const rows = [
      ['Memory', 'Total: ' + (m.total || '-') + ' · Used: ' + (m.used || '-') + ' · Free: ' + (m.free || '-') + ' · Available: ' + (m.available || '-')],
      ['Swap', (m.swap_total || '-') + ' total · ' + (m.swap_used || '-') + ' used · ' + (m.swap_free || '-') + ' free'],
      ['Uptime', data.uptime || '-'],
      ['Load', data.load || '-']
    ];
    return rows.map(function (r) {
      return '<div class="row"><span class="label">' + escapeHtml(r[0]) + '</span><span>' + escapeHtml(r[1]) + '</span></div>';
    }).join('');
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function loadingPlaceholderHtml() {
    return '<div class="loading-placeholder" role="status" aria-live="polite">' +
      '<div class="loading-placeholder-spinner" aria-hidden="true"></div>' +
      '<span>Loading<span class="loading-placeholder-dots"><span>.</span><span>.</span><span>.</span></span></span>' +
      '</div>';
  }

  function showToast(message, type) {
    type = type === 'error' ? 'toast-error' : 'toast-success';
    const container = el('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = '<span>' + escapeHtml(message) + '</span><button type="button" class="toast-dismiss" aria-label="Dismiss">&times;</button>';
    const dismiss = toast.querySelector('.toast-dismiss');
    function remove() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }
    dismiss.addEventListener('click', remove);
    container.appendChild(toast);
    setTimeout(remove, 6000);
  }

  function showActionLoading(unit, action) {
    const labels = { start: 'Starting', stop: 'Stopping', restart: 'Restarting' };
    const label = (labels[action] || action) + ' ' + unit + '…';
    const overlay = document.createElement('div');
    overlay.className = 'action-loading-overlay';
    overlay.id = 'action-loading-overlay';
    overlay.innerHTML = '<div class="action-loading-content"><div class="action-loading-spinner" aria-hidden="true"></div><span>' + escapeHtml(label) + '</span></div>';
    document.body.appendChild(overlay);
  }

  function hideActionLoading() {
    const overlay = el('action-loading-overlay');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function setSystemLastUpdate() {
    const el = document.getElementById('system-last-update');
    if (!el) return;
    var d = new Date();
    el.textContent = 'Updated ' + d.toLocaleTimeString();
  }

  function loadSystem() {
    setContent('system-content', '<div class="loading-placeholder-wrap">' + loadingPlaceholderHtml() + '</div>');
    var lastUpdateEl = document.getElementById('system-last-update');
    if (lastUpdateEl) lastUpdateEl.textContent = '';
    fetchJson(API.system)
      .then(function (data) {
        setContent('system-content', renderSystem(data));
        setSystemLastUpdate();
      })
      .catch(function (err) {
        setContent('system-content', '<p class="error-msg">Failed to load: ' + escapeHtml(err.message) + '</p>');
      });
  }

  function serviceStatusClass(active) {
    if (active === 'active') return 'active';
    if (active === 'failed') return 'failed';
    return 'inactive';
  }

  function renderServices(list) {
    if (!Array.isArray(list)) {
      return '<p class="error-msg">Invalid response</p>';
    }
    if (list.length === 0) {
      return '<p class="muted">No services found.</p>';
    }
    return list.map(function (s) {
      const unit = s.unit || '';
      const active = (s.active || '').toLowerCase();
      const enabled = s.enabled || '';
      const isActive = active === 'active';
      var action1 = '';
      var action2 = '';
      if (isActive) {
        action1 = '<button type="button" class="btn btn-danger btn-sm" data-action="stop" data-unit="' + escapeHtml(unit) + '">Stop</button>';
        action2 = '<button type="button" class="btn btn-secondary btn-sm" data-action="restart" data-unit="' + escapeHtml(unit) + '">Restart</button>';
      } else {
        action2 = '<button type="button" class="btn btn-primary btn-sm" data-action="start" data-unit="' + escapeHtml(unit) + '">Start</button>';
      }
      return '<div class="service-row" data-unit="' + escapeHtml(unit) + '">' +
        '<div class="service-col service-col-name">' + escapeHtml(unit) + '</div>' +
        '<div class="service-col service-col-status"><span class="service-status ' + serviceStatusClass(active) + '">' + escapeHtml(active || '-') + '</span></div>' +
        '<div class="service-col service-col-enabled">' + escapeHtml(enabled) + '</div>' +
        '<div class="service-col service-col-action">' + action1 + '</div>' +
        '<div class="service-col service-col-action">' + action2 + '</div>' +
        '</div>';
    }).join('');
  }

  let allServices = [];

  function getSearchFilter() {
    const searchEl = el('services-search');
    return (searchEl && searchEl.value) ? searchEl.value.trim().toLowerCase() : '';
  }

  function applySearchFilter() {
    const q = getSearchFilter();
    const list = q === '' ? allServices : allServices.filter(function (s) {
      const unit = (s.unit || '').toLowerCase();
      const active = (s.active || '').toLowerCase();
      const enabled = (s.enabled || '').toLowerCase();
      return unit.indexOf(q) !== -1 || active.indexOf(q) !== -1 || enabled.indexOf(q) !== -1;
    });
    setContent('services-list', renderServices(list));
    const countEl = el('services-count');
    if (countEl) countEl.textContent = list.length + (q ? ' of ' + allServices.length : '') + ' service(s)';
    bindServiceButtons();
  }

  function loadServices() {
    const listEl = el('services-list');
    if (listEl) listEl.classList.add('loading');
    setContent('services-list', '<div class="loading-placeholder-wrap">' + loadingPlaceholderHtml() + '</div>');

    fetchJson(API.services)
      .then(function (data) {
        if (data.error) {
          setContent('services-list', '<p class="error-msg">' + escapeHtml(data.error) + '</p>');
          el('services-count').textContent = '';
          return;
        }
        allServices = Array.isArray(data) ? data : (data.units || data.services || []);
        applySearchFilter();
      })
      .catch(function (err) {
        setContent('services-list', '<p class="error-msg">Failed to load: ' + escapeHtml(err.message) + '</p>');
        if (el('services-count')) el('services-count').textContent = '';
      })
      .finally(function () {
        if (listEl) listEl.classList.remove('loading');
      });
  }

  function bindServiceButtons() {
    document.querySelectorAll('.service-row [data-action][data-unit]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const action = this.getAttribute('data-action');
        const unit = this.getAttribute('data-unit');
        if (!action || !unit) return;
        runControl(action, unit, this);
      });
    });
  }

  function runControl(action, unit, buttonEl) {
    var row = buttonEl.closest('.service-row');
    if (row) row.classList.add('action-pending');
    buttonEl.disabled = true;
    showActionLoading(unit, action);

    fetch(API.control, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, unit: unit })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.ok) {
          var msg = (action === 'start' ? 'Started' : action === 'stop' ? 'Stopped' : 'Restarted') + ' ' + unit;
          showToast(msg, 'success');
          loadServices();
        } else {
          showToast(data && data.error ? data.error : 'Action failed', 'error');
        }
      })
      .catch(function () {
        showToast('Request failed', 'error');
      })
      .finally(function () {
        hideActionLoading();
        buttonEl.disabled = false;
        if (row) row.classList.remove('action-pending');
      });
  }

  el('btn-refresh').addEventListener('click', loadServices);
  var btnRefreshSystem = el('btn-refresh-system');
  if (btnRefreshSystem) btnRefreshSystem.addEventListener('click', loadSystem);

  const searchEl = el('services-search');
  if (searchEl) {
    searchEl.addEventListener('input', applySearchFilter);
    searchEl.addEventListener('search', applySearchFilter);
  }

  var versionEl = el('app-version');
  if (versionEl) versionEl.textContent = 'Version ' + APP_VERSION;

  loadSystem();
  loadServices();
  setInterval(loadSystem, SYSTEM_REFRESH_MS);
})();
