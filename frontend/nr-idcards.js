(function () {
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function initials(name) {
    return String(name || 'IM').split(' ').filter(Boolean).map(function (word) { return word[0]; }).join('').slice(0, 2).toUpperCase();
  }

  function certsFor(employeeId) {
    var db = getDB();
    var days = (db.settings && db.settings.expiration_alert_days) || 30;
    return (db.certificates || []).filter(function (cert) {
      return String(cert.employee_id) === String(employeeId) && cert.status !== 'cancelado' && calcStatus(cert.expiration_date, days) !== 'vencido';
    });
  }

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
    if (!file.type || file.type.indexOf('image/') !== 0) {
      showToast('Selecione uma imagem valida.', 'error');
      return;
    }
    if (file.size > 900000) {
      showToast('Use uma foto menor que 900 KB para salvar no banco.', 'error');
      return;
    }
    var employee = (getDB().employees || []).find(function (item) { return String(item.id) === String(employeeId); });
    if (!employee) return;
    var reader = new FileReader();
    reader.onload = async function () {
      try {
        await API.employees.update(employeeId, employeePayload(employee, reader.result));
        await refreshData();
        await renderPage();
        showToast('Foto salva na carteirinha!', 'success');
      } catch (err) {
        showToast('Erro ao salvar foto: ' + err.message, 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  window.printEmployeeCard = function (employeeId) {
    var set = document.getElementById('nr-set-' + employeeId);
    if (!set) return;
    var w = window.open('', '_blank', 'width=1200,height=760');
    w.document.write('<html><head><title>Carteirinha NR</title><link rel="stylesheet" href="/pro-dashboard.css"><link rel="stylesheet" href="/pro-polish.css"><link rel="stylesheet" href="/nr-idcards.css"></head><body><div class="print-area">' + set.outerHTML + '</div><script>setTimeout(function(){window.print();window.close()},350)</script></body></html>');
    w.document.close();
  };

  function renderQrCodes() {
    if (typeof QRCode === 'undefined') return;
    document.querySelectorAll('[data-nr-qr]').forEach(function (box) {
      if (box.dataset.done) return;
      box.dataset.done = '1';
      QRCode.toCanvas(box.dataset.nrQr, { width: 112, margin: 1 }, function (err, canvas) {
        if (!err) {
          box.innerHTML = '';
          box.appendChild(canvas);
        }
      });
    });
  }

  function trainingContent(trainingName) {
    var name = String(trainingName || '').toLowerCase();
    if (name.indexOf('11') >= 0 || name.indexOf('movimenta') >= 0 || name.indexOf('carga') >= 0) {
      return ['Inspecao pre-operacional', 'Operacao segura do equipamento', 'Sinalizacao e movimentacao de cargas', 'Riscos e medidas preventivas', 'Procedimentos de emergencia', 'Uso correto de EPIs'];
    }
    return ['Procedimentos seguros da atividade', 'Riscos e medidas preventivas', 'Responsabilidades do colaborador', 'Uso correto de EPIs', 'Condutas em emergencia'];
  }

  function primaryCertificate(employee) {
    var certs = certsFor(employee.id);
    return certs.slice().sort(function (a, b) { return new Date(a.expiration_date) - new Date(b.expiration_date); })[0] || null;
  }

  function cardSet(employee) {
    var db = getDB();
    var settings = db.settings || {};
    var cert = primaryCertificate(employee);
    var certs = certsFor(employee.id);
    var trainingCode = cert ? (cert.training_code || 'NR') : 'NR';
    var trainingName = cert ? (cert.training_name || 'Treinamento operacional') : 'Treinamento nao cadastrado';
    var qr = cert && cert.verification_token ? (location.origin + location.pathname + '#/verificar/' + cert.verification_token) : location.href;
    var photo = employee.photo_url ? `<img class="nr-photo" src="${employee.photo_url}" alt="Foto de ${esc(employee.full_name)}">` : `<div class="nr-photo-empty">${initials(employee.full_name)}</div>`;
    var tags = certs.slice(0, 6).map(function (item) { return `<li>${esc(item.training_code || 'NR')}</li>`; }).join('') || '<li>Treinamento pendente</li>';
    var content = trainingContent(trainingName).map(function (item) { return `<li>${esc(item)}</li>`; }).join('');
    var issue = cert ? formatDate(cert.issue_date) : formatDate(new Date().toISOString().slice(0, 10));
    var expiration = cert ? formatDate(cert.expiration_date) : '-';
    var workload = cert && cert.workload_hours ? cert.workload_hours + ' horas' : 'Conforme certificado';
    var instructor = settings.technical_responsible || 'Responsavel tecnico';
    var crea = settings.crea_number || '-';
    var company = settings.company_name || 'IMEC Compliance Industrial';

    return `<section class="nr-wallet-set" id="nr-set-${employee.id}">
      <div class="nr-id-wrap">
        <article class="nr-id-card">
          <div class="nr-front-header">
            <div class="nr-logo">IMEC<small>COMPLIANCE INDUSTRIAL</small></div>
            <div class="nr-title-block"><h3>Carteirinha ${esc(trainingCode)}</h3><p>${esc(employee.role_position || 'Colaborador autorizado')}</p></div>
          </div>
          <div class="nr-front-body">
            <div>${photo}</div>
            <div class="nr-info-list">
              <div class="nr-row"><span>Nome:</span><strong>${esc(employee.full_name)}</strong></div>
              <div class="nr-row"><span>CPF:</span><strong>${formatCPF(employee.cpf || '')}</strong></div>
              <div class="nr-row"><span>Funcao:</span><strong>${esc(employee.role_position || '-')}</strong></div>
              <div class="nr-row"><span>Empresa:</span><strong>${esc(company)}</strong></div>
              <div class="nr-row"><span>Matricula:</span><strong>${String(employee.id).padStart(6, '0')}</strong></div>
              <div class="nr-row"><span>Emissao:</span><strong>${issue}</strong></div>
              <div class="nr-row"><span>Validade:</span><strong>${expiration}</strong></div>
            </div>
          </div>
          <div class="nr-qr-status">
            <div class="nr-qr" data-nr-qr="${qr}"></div>
            <div class="nr-apto"><span>OK</span>${cert ? 'APTO' : 'PENDENTE'}</div>
          </div>
          <div class="nr-equipment-band"><div><h4>Treinamentos autorizados:</h4><ul>${tags}</ul></div><div class="nr-crane-mark">NR</div></div>
          <div class="nr-red-foot"></div>
        </article>
        <div class="nr-side-label">Frente</div>
        <div class="nr-actions">
          <label class="btn btn-outline btn-sm"><input class="nr-photo-input" type="file" accept="image/*" onchange="saveEmployeeCardPhoto('${employee.id}', this)">Adicionar foto</label>
          <button class="btn btn-primary btn-sm" onclick="printEmployeeCard('${employee.id}')">Imprimir / PDF</button>
        </div>
      </div>
      <div class="nr-id-wrap">
        <article class="nr-id-card">
          <div class="nr-back-head"><div class="nr-head-icon">OK</div><h3>Informacoes do Treinamento</h3></div>
          <div class="nr-back-body">
            <div class="nr-training-line"><span>Curso:</span><strong>${esc(trainingCode)} - ${esc(trainingName)}</strong></div>
            <div class="nr-training-line"><span>Carga horaria:</span><strong>${esc(workload)}</strong></div>
            <div class="nr-content-box"><div class="nr-red-circle">NR</div><div><div class="nr-content-title">Conteudo / competencias:</div><ul class="nr-content-list">${content}</ul></div></div>
            <div class="nr-instructor"><div class="nr-blue-circle">RT</div><div><div class="nr-training-line"><span>Instrutor:</span><strong>${esc(instructor)}</strong></div><div class="nr-training-line"><span>CREA:</span><strong>${esc(crea)}</strong></div></div></div>
            <div class="nr-note">OK - Este cartao deve ser apresentado junto ao certificado de treinamento quando solicitado.</div>
            <div class="nr-signatures"><div>Assinatura do responsavel</div><div>Assinatura do colaborador</div></div>
          </div>
          <div class="nr-back-foot"><span>NR | EPI | ASO | QR</span><strong class="nr-model-tag">Controle interno</strong></div>
        </article>
        <div class="nr-side-label">Verso</div>
      </div>
    </section>`;
  }

  function install() {
    if (typeof renderers === 'undefined') return false;
    renderers.idcards = async function () {
      var employees = (getDB().employees || []).filter(function (employee) { return employee.status === 'ativo'; });
      var body = employees.length ? employees.map(cardSet).join('') : '<div class="pro-empty"><div><strong>Nenhum funcionario ativo</strong><p class="mt-1 text-sm">Cadastre um funcionario ativo para gerar a carteirinha.</p></div></div>';
      setTimeout(renderQrCodes, 80);
      return `<div class="nr-card-toolbar"><div><h3 class="font-display text-xl font-extrabold text-slate-900">Carteirinhas NR frente e verso</h3><p class="text-sm text-slate-500">Modelo com foto, QR Code, dados do colaborador, treinamento e assinaturas. Deve acompanhar o certificado oficial.</p></div><button class="btn btn-outline btn-sm" onclick="window.print()">Imprimir todas</button></div><div class="nr-card-grid print-area">${body}</div>`;
    };
    return true;
  }

  function boot() {
    if (!install()) setTimeout(boot, 80);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
