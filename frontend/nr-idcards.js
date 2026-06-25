(function () {
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initials(name) {
    return String(name || '?')
      .trim()
      .split(/\s+/)
      .map(function (part) { return part.charAt(0); })
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  function formatCardDate(value) {
    if (!value) return '-';
    if (typeof formatDate === 'function') return formatDate(value);
    var clean = String(value).split('T')[0];
    var parts = clean.split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : clean;
  }

  function findEmployeeTraining(db, employeeId) {
    var certs = (db.certificates || [])
      .filter(function (cert) { return String(cert.employee_id) === String(employeeId) && cert.status !== 'cancelado'; })
      .sort(function (a, b) { return new Date(b.issue_date || 0) - new Date(a.issue_date || 0); });
    var cert = certs[0];
    var training = cert ? (db.trainings || []).find(function (item) { return String(item.id) === String(cert.training_id); }) : null;
    return { cert: cert, training: training };
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
    if (file.size > 5 * 1024 * 1024) {
      showToast('Use uma foto menor que 5 MB.', 'error');
      return;
    }
    var employee = (getDB().employees || []).find(function (item) { return String(item.id) === String(employeeId); });
    if (!employee) return;
    (async function () {
      try {
        var formData = new FormData();
        formData.append('file', file);
        var uploaded = await API.upload(formData);
        await API.employees.update(employeeId, employeePayload(employee, uploaded.url));
        await refreshData();
        await renderPage();
        showToast('Foto salva na carteirinha!', 'success');
      } catch (err) {
        showToast('Erro ao salvar foto: ' + err.message, 'error');
      }
    })();
  };

  window.showEmployeeCardAuthenticity = function (employeeId) {
    var db = getDB();
    var employee = (db.employees || []).find(function (item) { return String(item.id) === String(employeeId); });
    var data = employee ? findEmployeeTraining(db, employeeId) : {};
    var cert = data.cert;
    if (!cert || !cert.verification_token) {
      showToast('Este colaborador ainda nao tem certificado para autenticidade.', 'warning');
      return;
    }
    showPublicVerification(cert.verification_token);
  };

  function renderQrAfterPaint() {
    setTimeout(function () {
      document.querySelectorAll('[data-nr-qr]').forEach(function (el) {
        if (el.dataset.qrRendered) return;
        var value = el.getAttribute('data-nr-qr');
        if (!value || !window.QRCode) return;
        el.innerHTML = '';
        QRCode.toCanvas(value, { width: 112, margin: 1, color: { dark: '#061f3f', light: '#ffffff' } }, function (err, canvas) {
          if (!err && canvas) {
            el.appendChild(canvas);
            el.dataset.qrRendered = '1';
          } else {
            el.innerHTML = '<span>QR</span>';
          }
        });
      });
    }, 80);
  }

  function iconSvg(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  }

  function field(icon, label, value) {
    return '<div class="nr-field-row"><span class="nr-field-icon">' + icon + '</span><span class="nr-label">' + label + ':</span><strong>' + esc(value || '-') + '</strong></div>';
  }

  function cardForEmployee(employee, db) {
    var trainingData = findEmployeeTraining(db, employee.id);
    var cert = trainingData.cert || {};
    var training = trainingData.training || {};
    var settings = db.settings || {};
    var courseName = training.name || cert.training_name || 'NR - Treinamento nao cadastrado';
    var cardTitle = (training.code || cert.training_code || 'NR').replace(/\s+/g, ' ');
    var cardSub = training.name || employee.role_position || 'Treinamento autorizado';
    var issue = cert.issue_date || employee.admission_date;
    var expiration = cert.expiration_date;
    var workload = cert.workload || training.default_workload || 'Conforme certificado';
    var token = cert.verification_token;
    var baseUrl = window.location.origin;
    var qr = token ? baseUrl + '/?verify=' + encodeURIComponent(token) : '';
    var cpf = typeof formatCPF === 'function' ? formatCPF(employee.cpf || '') : (employee.cpf || '');
    var photo = employee.photo_url ? '<img class="nr-photo" src="' + employee.photo_url + '" alt="Foto de ' + esc(employee.full_name) + '">' : '<div class="nr-photo-empty">' + initials(employee.full_name) + '</div>';
    var authorized = training.code || training.name ? (training.code ? training.code + ' - ' : '') + (training.name || '') : 'Treinamento pendente';

    var userIcon = iconSvg('<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>');
    var cpfIcon = iconSvg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>');
    var roleIcon = iconSvg('<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M4 22a8 8 0 0 1 16 0"/>');
    var companyIcon = iconSvg('<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1M9 13h1M9 17h1M15 13h1M15 17h1"/>');
    var idIcon = iconSvg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h3M7 12h10M7 16h7"/>');
    var calIcon = iconSvg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>');

    return '<div class="nr-card-pair">' +
      '<article class="nr-id-card nr-front-card">' +
        '<div class="nr-brand"><div class="nr-logo-main">IMEC</div><div class="nr-logo-sub">COMPLIANCE INDUSTRIAL</div></div>' +
        '<div class="nr-title-block"><h3>CARTEIRINHA ' + esc(cardTitle) + '</h3><p>' + esc(cardSub) + '</p></div>' +
        '<div class="nr-front-content">' +
          '<div class="nr-left-column">' + photo + '<div class="nr-qr" data-nr-qr="' + esc(qr) + '"><span>QR</span></div></div>' +
          '<div class="nr-info-column">' +
            field(userIcon, 'NOME', employee.full_name) +
            field(cpfIcon, 'CPF', cpf) +
            field(roleIcon, 'FUNCAO', employee.role_position) +
            field(companyIcon, 'EMPRESA', settings.company_name || 'IMEC Solucoes Industriais') +
            field(idIcon, 'MATRICULA', String(employee.id).padStart(6, '0')) +
            field(calIcon, 'EMISSAO', formatCardDate(issue)) +
            field(calIcon, 'VALIDADE', formatCardDate(expiration)) +
            '<div class="nr-apt"><span>OK</span><strong>APTO</strong></div>' +
            '<div class="nr-token"><span>CODIGO DE VERIFICACAO</span><strong>' + esc(token || 'Sem certificado') + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="nr-bottom-band"><div><span>TREINAMENTOS AUTORIZADOS:</span><strong>' + esc(authorized) + '</strong></div><b>NR</b></div>' +
      '</article>' +
      '<div class="nr-side-label">Frente</div>' +
      '<article class="nr-id-card nr-back-card">' +
        '<div class="nr-back-head"><div class="nr-head-icon">' + iconSvg('<path d="M9 11h6M9 15h6M9 7h6"/><rect x="5" y="3" width="14" height="18" rx="2"/>') + '</div><h3>INFORMACOES DO TREINAMENTO</h3></div>' +
        '<div class="nr-back-content">' +
          '<div class="nr-training-row"><span class="nr-round-icon">' + iconSvg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>') + '</span><b>CURSO:</b><strong>' + esc(courseName) + '</strong></div>' +
          '<div class="nr-training-row"><span class="nr-round-icon">' + iconSvg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>') + '</span><b>CARGA HORARIA:</b><strong>' + esc(workload) + (typeof workload === 'number' ? ' horas' : '') + '</strong></div>' +
          '<div class="nr-competencies"><span>NR</span><div><b>CONTEUDO / COMPETENCIAS:</b><ul><li>Procedimentos seguros da atividade</li><li>Riscos e medidas preventivas</li><li>Responsabilidades do colaborador</li><li>Uso correto de EPIs</li><li>Condutas em emergencia</li></ul></div></div>' +
          '<div class="nr-instructor"><span>' + iconSvg('<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>') + '</span><div><b>INSTRUTOR RESPONSAVEL:</b><b>CREA:</b></div><div><strong>' + esc(cert.instructor_name || settings.technical_responsible || '-') + '</strong><strong>' + esc(cert.crea_number || settings.crea_number || '-') + '</strong></div></div>' +
          '<div class="nr-note"><span>' + iconSvg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>') + '</span>Este cartao deve ser apresentado junto ao certificado de treinamento quando solicitado.</div>' +
          '<div class="nr-signatures"><div>ASSINATURA DO RESPONSAVEL</div><div>ASSINATURA DO COLABORADOR</div></div>' +
        '</div>' +
        '<div class="nr-back-foot"><span>NR | EPI | ASO | QR</span><b>Controle interno</b></div>' +
      '</article>' +
      '<div class="nr-side-label">Verso</div>' +
      '<div class="nr-card-actions no-print">' +
        '<label class="btn btn-outline btn-sm"><input class="nr-photo-input" type="file" accept="image/*" onchange="saveEmployeeCardPhoto(\'' + employee.id + '\', this)">Adicionar foto</label>' +
        '<button class="btn btn-outline btn-sm" onclick="showEmployeeCardAuthenticity(\'' + employee.id + '\')">Ver autenticidade</button>' +
        '<button class="btn btn-primary btn-sm" onclick="window.print()">Imprimir / PDF</button>' +
      '</div>' +
    '</div>';
  }

  function renderIdCardsPage() {
    var db = getDB();
    var employees = (db.employees || []).filter(function (employee) { return employee.status === 'ativo'; });
    if (!employees.length) {
      return '<div class="card p-6 text-center text-slate-500">Nenhum funcionario ativo para gerar carteirinha.</div>';
    }
    var body = employees.map(function (employee) { return cardForEmployee(employee, db); }).join('');
    setTimeout(renderQrAfterPaint, 120);
    return '<div class="nr-card-toolbar"><div><h3 class="font-display text-xl font-extrabold text-slate-900">Carteirinhas NR frente e verso</h3><p class="text-sm text-slate-500">Modelo de impressao com foto, QR Code e codigo de verificacao. A leitura do QR abre a consulta publica de autenticidade.</p></div><button class="btn btn-outline btn-sm" onclick="window.print()">Imprimir todas</button></div><div class="nr-card-grid print-area">' + body + '</div>';
  }

  function installRenderer(attempt) {
    if (window.renderers) {
      window.renderers.idcards = async function () {
        return renderIdCardsPage();
      };
      return;
    }
    if (attempt < 30) setTimeout(function () { installRenderer(attempt + 1); }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { installRenderer(0); });
  } else {
    installRenderer(0);
  }
})();
