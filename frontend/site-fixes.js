(function () {
  'use strict';

  var LOGO_SRC = 'data:image/webp;base64,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';

  window.IMEC_LOGO_SRC = LOGO_SRC;

  var ID_FIELDS = ['id','employee_id','training_id','client_id','project_id','equipment_id','user_id','created_by','entity_id'];
  var DATE_FIELDS = ['birth_date','admission_date','issue_date','expiration_date','delivery_date','replacement_date','start_date','end_date','created_at','updated_at'];

  function toDateInput(value) { return value ? String(value).split('T')[0].slice(0, 10) : value; }

  function normalizeRecord(record) {
    if (!record || typeof record !== 'object') return record;
    ID_FIELDS.forEach(function (field) {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') record[field] = String(record[field]);
    });
    DATE_FIELDS.forEach(function (field) { if (record[field]) record[field] = toDateInput(record[field]); });
    return record;
  }

  function normalizeDashboard(dashboard) {
    if (!dashboard || typeof dashboard !== 'object') return dashboard;
    var pairs = { activeEmployees:'active_employees', validCertificates:'valid_certificates', expiringCertificates:'expiring_certificates', expiredCertificates:'expired_certificates', expiredASO:'expired_aso', totalEquipment:'total_equipment', totalCranes:'total_cranes', expiredLaudos:'expired_laudos', activeProjects:'active_projects', totalCertificates:'total_certificates', cancelledCertificates:'cancelled_certificates', totalClients:'total_clients' };
    Object.keys(pairs).forEach(function (camelKey) {
      var snakeKey = pairs[camelKey];
      if (dashboard[snakeKey] === undefined && dashboard[camelKey] !== undefined) dashboard[snakeKey] = dashboard[camelKey];
      if (dashboard[camelKey] === undefined && dashboard[snakeKey] !== undefined) dashboard[camelKey] = dashboard[snakeKey];
    });
    return dashboard;
  }

  function normalizeCollections(db) {
    if (!db || typeof db !== 'object') return db;
    Object.keys(db).forEach(function (key) { if (Array.isArray(db[key])) db[key].forEach(normalizeRecord); });
    if (db.dashboard) normalizeDashboard(db.dashboard);
    return db;
  }

  function patchRefreshData() {
    if (typeof window.refreshData !== 'function' || window.refreshData.__imecSiteFixes) return false;
    var originalRefreshData = window.refreshData;
    window.refreshData = async function () {
      var result = await originalRefreshData.apply(this, arguments);
      try { if (typeof window.getDB === 'function') normalizeCollections(window.getDB()); } catch (err) { console.warn('[IMEC] Falha ao normalizar dados do sistema', err); }
      return result;
    };
    window.refreshData.__imecSiteFixes = true;
    try { if (typeof window.getDB === 'function') normalizeCollections(window.getDB()); } catch (err) { console.warn('[IMEC] Falha ao normalizar dados iniciais', err); }
    return true;
  }

  function injectBrandStyles() {
    if (document.getElementById('imec-brand-logo-styles')) return;
    var style = document.createElement('style');
    style.id = 'imec-brand-logo-styles';
    style.textContent = '.imec-logo-img{display:block;width:100%;height:100%;object-fit:contain}.imec-login-logo-frame{width:230px!important;height:132px!important;margin-bottom:10px!important;border:0!important;background:rgba(255,255,255,.96)!important;border-radius:18px!important;padding:12px!important;box-shadow:0 20px 60px rgba(2,8,23,.28)!important}.imec-sidebar-logo-frame{width:52px!important;height:40px!important;border-radius:10px!important;background:#fff!important;padding:5px!important;box-shadow:0 8px 20px rgba(0,0,0,.18)!important;flex-shrink:0!important}.imec-public-logo{width:190px;height:auto;margin:0 auto 14px;display:block}.imec-brand-name{letter-spacing:.01em}.nr-brand{width:250px!important;padding:18px 0 0 24px!important}.nr-brand-logo{display:block;width:220px;height:auto;max-height:124px;object-fit:contain;filter:drop-shadow(0 8px 12px rgba(7,27,58,.2))}@media(max-width:640px){.imec-login-logo-frame{width:190px!important;height:110px!important}}';
    document.head.appendChild(style);
  }

  function logoMarkup(className) { return '<img class="imec-logo-img ' + (className || '') + '" src="' + LOGO_SRC + '" alt="IMEC Metalurgica">'; }

  function replaceBranding() {
    injectBrandStyles();

    var loginMark = document.querySelector('#loginScreen .inline-flex');
    if (loginMark && !loginMark.dataset.imecLogoApplied) {
      loginMark.dataset.imecLogoApplied = '1';
      loginMark.classList.add('imec-login-logo-frame');
      loginMark.innerHTML = logoMarkup('');
    }
    var loginTitle = document.querySelector('#loginScreen h1');
    if (loginTitle) { loginTitle.textContent = 'IMEC Metalurgica'; loginTitle.classList.add('imec-brand-name'); }
    var loginSubtitle = document.querySelector('#loginScreen h1 + p');
    if (loginSubtitle) loginSubtitle.textContent = 'Compliance Industrial';

    var sidebarMark = document.querySelector('#sidebar .p-5 .w-10.h-10');
    if (sidebarMark && !sidebarMark.dataset.imecLogoApplied) {
      sidebarMark.dataset.imecLogoApplied = '1';
      sidebarMark.classList.add('imec-sidebar-logo-frame');
      sidebarMark.innerHTML = logoMarkup('');
    }
    var sidebarTitle = document.querySelector('#sidebar .p-5 h2');
    if (sidebarTitle) sidebarTitle.textContent = 'IMEC Metalurgica';
    var sidebarSubtitle = document.querySelector('#sidebar .p-5 p');
    if (sidebarSubtitle) sidebarSubtitle.textContent = 'Compliance Industrial';

    var publicTitle = document.querySelector('#publicPage h1');
    if (publicTitle && !publicTitle.dataset.imecLogoApplied) {
      publicTitle.dataset.imecLogoApplied = '1';
      publicTitle.insertAdjacentHTML('beforebegin', '<img class="imec-public-logo" src="' + LOGO_SRC + '" alt="IMEC Metalurgica">');
      publicTitle.textContent = 'Consulta de Certificado';
    }

    document.querySelectorAll('.nr-brand:not([data-imec-logo-applied])').forEach(function (brand) {
      brand.dataset.imecLogoApplied = '1';
      brand.innerHTML = '<img class="nr-brand-logo" src="' + LOGO_SRC + '" alt="IMEC Metalurgica">';
    });
  }

  function boot(attempt) {
    if (!patchRefreshData() && attempt < 20) { setTimeout(function () { boot(attempt + 1); }, 100); return; }
    replaceBranding();
    try { if (typeof window.getDB === 'function') normalizeDashboard(window.getDB().dashboard); } catch (err) { console.warn('[IMEC] Falha ao normalizar dashboard', err); }
    if (!window.__imecBrandObserver) {
      window.__imecBrandObserver = new MutationObserver(function () { replaceBranding(); });
      window.__imecBrandObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(0); });
  else boot(0);
})();
