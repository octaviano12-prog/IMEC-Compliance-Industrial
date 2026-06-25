(function () {
  'use strict';

  var ID_FIELDS = ['id','employee_id','training_id','client_id','project_id','equipment_id','equipment_document_id','medical_exam_id','epi_record_id','technical_document_id','certificate_id','competency_requirement_id','user_id','created_by','entity_id'];
  var DATE_FIELDS = ['birth_date','admission_date','issue_date','expiration_date','delivery_date','replacement_date','start_date','end_date','created_at','updated_at'];

  window.sameId = function sameId(a, b) { return String(a) === String(b); };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toDateInput(value) { return value ? String(value).split('T')[0].slice(0, 10) : value; }
  function fmtDate(value) {
    if (!value) return '-';
    if (typeof window.formatDate === 'function') return window.formatDate(value);
    var clean = toDateInput(value);
    var parts = clean.split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : clean;
  }
  function fmtCpf(value) {
    if (typeof window.formatCPF === 'function') return window.formatCPF(value || '');
    return String(value || '').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).map(function (part) { return part.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== 'object') return record;
    ID_FIELDS.forEach(function (field) {
      if (record[field] !== undefined && record[field] !== null && record[field] !== '') record[field] = String(record[field]);
    });
    DATE_FIELDS.forEach(function (field) { if (record[field]) record[field] = toDateInput(record[field]); });
    if (Array.isArray(record.required_training_ids)) record.required_training_ids = record.required_training_ids.map(String);
    return record;
  }

  function getLiveDB() {
    try { if (typeof window.getDB === 'function') return window.getDB(); } catch (err) {}
    if (window.db && typeof window.db === 'object') return window.db;
    return null;
  }

  function normalizeCollections(db) {
    if (!db || typeof db !== 'object') return db;
    Object.keys(db).forEach(function (key) { if (Array.isArray(db[key])) db[key].forEach(normalizeRecord); });
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
      ['activeEmployees', 'active_employees'], ['validNRs', 'valid_nrs'], ['expiringNRs', 'expiring_nrs'], ['expiredNRs', 'expired_nrs'],
      ['validCertificates', 'valid_certificates'], ['expiringCertificates', 'expiring_certificates'], ['expiredCertificates', 'expired_certificates'],
      ['expiredASO', 'expired_aso'], ['equipment', 'equipment_count'], ['totalEquipment', 'total_equipment'], ['guindastes', 'guindastes_count'],
      ['totalCranes', 'total_cranes'], ['expiredReports', 'expired_reports'], ['expiredLaudos', 'expired_laudos'], ['activeProjects', 'active_projects'],
      ['issuedCertificates', 'issued_certificates'], ['totalCertificates', 'total_certificates'], ['cancelledCertificates', 'cancelled_certificates'],
      ['clients', 'clients_count'], ['totalClients', 'total_clients']
    ].forEach(function (pair) { setBoth(dashboard, pair[0], pair[1]); });
    return dashboard;
  }

  function normalizeLiveData() { normalizeCollections(getLiveDB()); }

  function employeePayload(employee, photoUrl) {
    return {
      full_name: employee.full_name,
      cpf: employee.cpf,
      rg: employee.rg,
      birth_date: employee.birth_date,
      phone: employee.phone,
      email: employee.email,
      address: employee.address,
      role_position: employee.role_position,
      department: employee.department,
      admission_date: employee.admission_date,
      status: employee.status,
      notes: employee.notes,
      photo_url: photoUrl
    };
  }

  window.saveEmployeeCardPhoto = function (employeeId, input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (!file.type || file.type.indexOf('image/') !== 0) { showToast('Selecione uma imagem valida.', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { showToast('Use uma foto menor que 5 MB.', 'error'); return; }
    var db = getLiveDB();
    var employee = db && (db.employees || []).find(function (item) { return sameId(item.id, employeeId); });
    if (!employee) return;
    (async function () {
      try {
        var formData = new FormData();
        formData.append('file', file);
        var uploaded = await API.upload(formData);
        await API.employees.update(employeeId, employeePayload(employee, uploaded.url));
        await refreshData();
        renderIdCardsIntoPage(true);
        showToast('Foto salva na carteirinha!', 'success');
      } catch (err) {
        showToast('Erro ao salvar foto: ' + err.message, 'error');
      }
    })();
  };

  window.showEmployeeCardAuthenticity = function (employeeId) {
    var db = getLiveDB();
    var cert = db && (db.certificates || []).find(function (item) { return sameId(item.employee_id, employeeId) && item.verification_token && item.status !== 'cancelado'; });
    if (!cert) { showToast('Este colaborador ainda nao tem certificado para autenticidade.', 'warning'); return; }
    showPublicVerification(cert.verification_token);
  };

  function findTrainingData(employee) {
    var db = getLiveDB() || {};
    var certs = (db.certificates || []).filter(function (cert) { return sameId(cert.employee_id, employee.id) && cert.status !== 'cancelado'; });
    certs.sort(function (a, b) { return new Date(b.issue_date || 0) - new Date(a.issue_date || 0); });
    var cert = certs[0] || null;
    var training = cert ? (db.trainings || []).find(function (item) { return sameId(item.id, cert.training_id); }) : null;
    return { cert: cert, training: training };
  }

  function renderQrCodes() {
    setTimeout(function () {
      document.querySelectorAll('[data-nr-qr]').forEach(function (el) {
        if (el.dataset.qrRendered) return;
        var value = el.getAttribute('data-nr-qr');
        if (!value || !window.QRCode) return;
        el.innerHTML = '';
        QRCode.toCanvas(value, { width: 112, margin: 1, color: { dark: '#061f3f', light: '#ffffff' } }, function (err, canvas) {
          if (!err && canvas) { el.appendChild(canvas); el.dataset.qrRendered = '1'; }
          else el.innerHTML = '<span>QR</span>';
        });
      });
    }, 100);
  }

  function cardForEmployee(employee) {
    var db = getLiveDB() || {};
    var settings = db.settings || {};
    var data = findTrainingData(employee);
    var cert = data.cert || {};
    var training = data.training || {};
    var courseName = training.name || cert.training_name || 'NR - Treinamento nao cadastrado';
    var cardTitle = training.code || cert.training_code || 'NR';
    var cardSub = training.name || employee.role_position || 'Treinamento autorizado';
    var token = cert.verification_token || '';
    var qrUrl = token ? window.location.origin + '/#/verificar/' + encodeURIComponent(token) : '';
    var photo = employee.photo_url ? '<img class="nr-photo" src="' + esc(employee.photo_url) + '" alt="Foto de ' + esc(employee.full_name) + '">' : '<div class="nr-photo-empty">' + initials(employee.full_name) + '</div>';
    var authorized = training.code || training.name ? (training.code ? training.code + ' - ' : '') + (training.name || '') : 'Treinamento pendente';
    var workload = cert.workload || training.default_workload || 'Conforme certificado';

    return '<section class="nr-card-pair">'
      + '<article class="nr-id-card nr-front-card">'
      + '<div class="nr-brand"><div class="nr-logo-main">IMEC</div><div class="nr-logo-sub">COMPLIANCE INDUSTRIAL</div></div>'
      + '<div class="nr-title-block"><h3>CARTEIRINHA ' + esc(cardTitle) + '</h3><p>' + esc(cardSub) + '</p></div>'
      + '<div class="nr-front-content"><div class="nr-left-column">' + photo + '<div class="nr-qr" data-nr-qr="' + esc(qrUrl) + '"><span>QR</span></div></div>'
      + '<div class="nr-info-column">'
      + '<div class="nr-field-row"><span class="nr-label">NOME:</span><strong>' + esc(employee.full_name) + '</strong></div>'
      + '<div class="nr-field-row"><span class="nr-label">CPF:</span><strong>' + esc(fmtCpf(employee.cpf)) + '</strong></div>'
      + '<div class="nr-field-row"><span class="nr-label">FUNCAO:</span><strong>' + esc(employee.role_position || '-') + '</strong></div>'
      + '<div class="nr-field-row"><span class="nr-label">EMPRESA:</span><strong>' + esc(settings.company_name || 'IMEC Solucoes Industriais') + '</strong></div>'
      + '<div class="nr-field-row"><span class="nr-label">MATRICULA:</span><strong>' + esc(String(employee.id).padStart(6, '0')) + '</strong></div>'
      + '<div class="nr-field-row"><span class="nr-label">EMISSAO:</span><strong>' + esc(fmtDate(cert.issue_date || employee.admission_date)) + '</strong></div>'
      + '<div class="nr-field-row"><span class="nr-label">VALIDADE:</span><strong>' + esc(fmtDate(cert.expiration_date)) + '</strong></div>'
      + '<div class="nr-apt"><span>OK</span><strong>APTO</strong></div>'
      + '<div class="nr-token"><span>CODIGO DE VERIFICACAO</span><strong>' + esc(token || 'Sem certificado') + '</strong></div>'
      + '</div></div><div class="nr-bottom-band"><div><span>TREINAMENTOS AUTORIZADOS:</span><strong>' + esc(authorized) + '</strong></div><b>NR</b></div></article>'
      + '<div class="nr-side-label">Frente</div>'
      + '<article class="nr-id-card nr-back-card"><div class="nr-back-head"><div class="nr-head-icon">OK</div><h3>INFORMACOES DO TREINAMENTO</h3></div>'
      + '<div class="nr-back-content">'
      + '<div class="nr-training-row"><span class="nr-round-icon"></span><b>CURSO:</b><strong>' + esc(courseName) + '</strong></div>'
      + '<div class="nr-training-row"><span class="nr-round-icon"></span><b>CARGA HORARIA:</b><strong>' + esc(workload) + (typeof workload === 'number' ? ' horas' : '') + '</strong></div>'
      + '<div class="nr-competencies"><span>NR</span><div><b>CONTEUDO / COMPETENCIAS:</b><ul><li>Procedimentos seguros da atividade</li><li>Riscos e medidas preventivas</li><li>Responsabilidades do colaborador</li><li>Uso correto de EPIs</li><li>Condutas em emergencia</li></ul></div></div>'
      + '<div class="nr-instructor"><span></span><div><b>INSTRUTOR RESPONSAVEL:</b><b>CREA:</b></div><div><strong>' + esc(cert.instructor_name || settings.technical_responsible || '-') + '</strong><strong>' + esc(cert.crea_number || settings.crea_number || '-') + '</strong></div></div>'
      + '<div class="nr-note"><span></span>Este cartao deve ser apresentado junto ao certificado de treinamento quando solicitado.</div>'
      + '<div class="nr-signatures"><div>ASSINATURA DO RESPONSAVEL</div><div>ASSINATURA DO COLABORADOR</div></div>'
      + '</div><div class="nr-back-foot"><span>NR | EPI | ASO | QR</span><b>Controle interno</b></div></article>'
      + '<div class="nr-side-label">Verso</div>'
      + '<div class="nr-card-actions no-print"><label class="btn btn-outline btn-sm"><input class="nr-photo-input" type="file" accept="image/*" onchange="saveEmployeeCardPhoto(\'' + esc(employee.id) + '\', this)">Adicionar foto</label><button class="btn btn-outline btn-sm" onclick="showEmployeeCardAuthenticity(\'' + esc(employee.id) + '\')">Ver autenticidade</button><button class="btn btn-primary btn-sm" onclick="window.print()">Imprimir / PDF</button></div>'
      + '</section>';
  }

  window.renderIdCardsPage = function renderIdCardsPage() {
    normalizeLiveData();
    var db = getLiveDB() || {};
    var employees = (db.employees || []).filter(function (employee) { return employee.status === 'ativo'; });
    var body = employees.length ? employees.map(cardForEmployee).join('') : '<div class="card p-6 text-center text-gray-500">Nenhum funcionario ativo para gerar carteirinha.</div>';
    setTimeout(renderQrCodes, 120);
    return '<div class="nr-card-toolbar"><div><h3 class="font-display text-xl font-extrabold text-slate-900">Carteirinhas NR frente e verso</h3><p class="text-sm text-slate-500">Modelo com foto, QR Code, dados do colaborador, treinamento e assinaturas.</p></div><button class="btn btn-outline btn-sm" onclick="window.print()">Imprimir todas</button></div><div class="nr-card-grid print-area">' + body + '</div>';
  };

  function isIdCardsPage() {
    var title = document.getElementById('pageTitle');
    return title && title.textContent.trim().toLowerCase().indexOf('carteirinha') !== -1;
  }

  function renderIdCardsIntoPage(force) {
    if (!force && !isIdCardsPage()) return;
    var content = document.getElementById('pageContent');
    if (!content) return;
    content.innerHTML = '<div class="fade-in">' + window.renderIdCardsPage() + '</div>';
  }

  function patchRefreshData() {
    if (typeof window.refreshData !== 'function' || window.refreshData.__imecPatched) return false;
    var originalRefreshData = window.refreshData;
    window.refreshData = async function () {
      var result = await originalRefreshData.apply(this, arguments);
      normalizeLiveData();
      return result;
    };
    window.refreshData.__imecPatched = true;
    normalizeLiveData();
    return true;
  }

  function patchPageRendering() {
    if (typeof window.renderPage === 'function' && !window.renderPage.__imecCardsPatched) {
      var originalRenderPage = window.renderPage;
      window.renderPage = async function () {
        var result = await originalRenderPage.apply(this, arguments);
        renderIdCardsIntoPage(false);
        return result;
      };
      window.renderPage.__imecCardsPatched = true;
    }
  }

  function patchEditFunctions() {
    ['editEmployee','viewEmployee','editTraining','editCertificate','editASO','editEPI','editEquipment','editClient','editProject','editDocument','editRequirement'].forEach(function (name) {
      var fn = window[name];
      if (typeof fn !== 'function' || fn.__imecPatched) return;
      window[name] = function () { normalizeLiveData(); return fn.apply(this, arguments); };
      window[name].__imecPatched = true;
    });
  }

  function boot(attempt) {
    patchRefreshData();
    patchEditFunctions();
    patchPageRendering();
    normalizeLiveData();
    renderIdCardsIntoPage(false);
    if (attempt < 60) setTimeout(function () { boot(attempt + 1); }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(0); });
  else boot(0);
})();
