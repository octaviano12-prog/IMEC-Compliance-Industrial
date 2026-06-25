(function () {
  'use strict';

  var ID_FIELDS = [
    'id',
    'employee_id',
    'training_id',
    'client_id',
    'project_id',
    'equipment_id',
    'user_id',
    'created_by',
    'entity_id'
  ];

  var DATE_FIELDS = [
    'birth_date',
    'admission_date',
    'issue_date',
    'expiration_date',
    'delivery_date',
    'replacement_date',
    'start_date',
    'end_date',
    'created_at',
    'updated_at'
  ];

  function toDateInput(value) {
    if (!value) return value;
    return String(value).split('T')[0].slice(0, 10);
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

  function normalizeDashboard(dashboard) {
    if (!dashboard || typeof dashboard !== 'object') return dashboard;

    var pairs = {
      activeEmployees: 'active_employees',
      validCertificates: 'valid_certificates',
      expiringCertificates: 'expiring_certificates',
      expiredCertificates: 'expired_certificates',
      expiredASO: 'expired_aso',
      totalEquipment: 'total_equipment',
      totalCranes: 'total_cranes',
      expiredLaudos: 'expired_laudos',
      activeProjects: 'active_projects',
      totalCertificates: 'total_certificates',
      cancelledCertificates: 'cancelled_certificates',
      totalClients: 'total_clients'
    };

    Object.keys(pairs).forEach(function (camelKey) {
      var snakeKey = pairs[camelKey];
      if (dashboard[snakeKey] === undefined && dashboard[camelKey] !== undefined) {
        dashboard[snakeKey] = dashboard[camelKey];
      }
      if (dashboard[camelKey] === undefined && dashboard[snakeKey] !== undefined) {
        dashboard[camelKey] = dashboard[snakeKey];
      }
    });

    return dashboard;
  }

  function patchRefreshData() {
    if (typeof window.refreshData !== 'function' || window.refreshData.__imecSiteFixes) return false;

    var originalRefreshData = window.refreshData;
    window.refreshData = async function () {
      var result = await originalRefreshData.apply(this, arguments);
      try {
        if (typeof window.getDB === 'function') normalizeCollections(window.getDB());
      } catch (err) {
        console.warn('[IMEC] Falha ao normalizar dados do sistema', err);
      }
      return result;
    };
    window.refreshData.__imecSiteFixes = true;

    try {
      if (typeof window.getDB === 'function') normalizeCollections(window.getDB());
    } catch (err) {
      console.warn('[IMEC] Falha ao normalizar dados iniciais', err);
    }

    return true;
  }

  function boot(attempt) {
    if (!patchRefreshData() && attempt < 20) {
      setTimeout(function () { boot(attempt + 1); }, 100);
      return;
    }

    try {
      if (typeof window.getDB === 'function') normalizeDashboard(window.getDB().dashboard);
    } catch (err) {
      console.warn('[IMEC] Falha ao normalizar dashboard', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { boot(0); });
  } else {
    boot(0);
  }
})();
