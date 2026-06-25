(function () {
  'use strict';

  var ID_FIELDS = ['id','employee_id','training_id','client_id','project_id','equipment_id','user_id','created_by','entity_id'];
  var DATE_FIELDS = ['birth_date','admission_date','issue_date','expiration_date','delivery_date','replacement_date','start_date','end_date','created_at','updated_at'];

  function toDateInput(value) {
    return value ? String(value).split('T')[0].slice(0, 10) : value;
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== 'object') return record;

    ID_FIELDS.forEach(function (field) {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') {
        record[field] = String(record[field]);
      }
    });

    DATE_FIELDS.forEach(function (field) {
      if (record[field]) record[field] = toDateInput(record[field]);
    });

    return record;
  }

  function normalizeCollections(db) {
    if (!db || typeof db !== 'object') return db;

    Object.keys(db).forEach(function (key) {
      if (Array.isArray(db[key])) db[key].forEach(normalizeRecord);
    });

    if (db.dashboard) normalizeDashboard(db.dashboard);
    return db;
  }

  function setBoth(target, camelKey, snakeKey) {
    if (!target || typeof target !== 'object') return;
    var value = target[camelKey];
    if (value === undefined) value = target[snakeKey];
    if (value === undefined || value === null) value = 0;
    target[camelKey] = value;
    target[snakeKey] = value;
  }

  function normalizeDashboard(dashboard) {
    if (!dashboard || typeof dashboard !== 'object') return dashboard;

    [
      ['activeEmployees', 'active_employees'],
      ['validNRs', 'valid_nrs'],
      ['expiringNRs', 'expiring_nrs'],
      ['expiredNRs', 'expired_nrs'],
      ['expiredASO', 'expired_aso'],
      ['equipment', 'equipment_count'],
      ['guindastes', 'guindastes_count'],
      ['expiredReports', 'expired_reports'],
      ['activeProjects', 'active_projects'],
      ['issuedCertificates', 'issued_certificates'],
      ['cancelledCertificates', 'cancelled_certificates'],
      ['clients', 'clients_count']
    ].forEach(function (pair) {
      setBoth(dashboard, pair[0], pair[1]);
    });

    return dashboard;
  }

  function patchRefreshData() {
    if (typeof window.refreshData !== 'function' || window.refreshData.__imecPatched) return false;

    var originalRefreshData = window.refreshData;
    window.refreshData = async function () {
      var result = await originalRefreshData.apply(this, arguments);
      normalizeCollections(window.db);
      return result;
    };
    window.refreshData.__imecPatched = true;

    normalizeCollections(window.db);
    return true;
  }

  function boot(attempt) {
    if (!patchRefreshData() && attempt < 20) {
      setTimeout(function () { boot(attempt + 1); }, 250);
      return;
    }

    if (window.dashboardStats) normalizeDashboard(window.dashboardStats);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { boot(0); });
  } else {
    boot(0);
  }
})();
