const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const [settings] = await db.query('SELECT expiration_alert_days FROM system_settings LIMIT 1');
    const alertDays = settings[0]?.expiration_alert_days || 30;

    const [activeEmployees] = await db.query("SELECT COUNT(*) as count FROM employees WHERE status = 'ativo'");
    const [totalCertificates] = await db.query('SELECT COUNT(*) as count FROM certificates');
    const [cancelledCertificates] = await db.query("SELECT COUNT(*) as count FROM certificates WHERE status = 'cancelado'");
    const [totalClients] = await db.query('SELECT COUNT(*) as count FROM clients');
    const [totalEquipment] = await db.query('SELECT COUNT(*) as count FROM equipment');
    const [totalCranes] = await db.query("SELECT COUNT(*) as count FROM equipment WHERE type = 'guindaste' OR type = 'grua' OR type = 'ponte_rolante'");

    const now = new Date();

    const [allCerts] = await db.query(`
      SELECT c.status, c.expiration_date
      FROM certificates c
    `);

    let validCertificates = 0;
    let expiringCertificates = 0;
    let expiredCertificates = 0;

    for (const cert of allCerts) {
      if (cert.status === 'cancelado') continue;
      const expDate = new Date(cert.expiration_date);
      const daysUntil = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) {
        expiredCertificates++;
      } else if (daysUntil <= alertDays) {
        expiringCertificates++;
      } else {
        validCertificates++;
      }
    }

    const [asoResults] = await db.query(`
      SELECT next_exam_date FROM medical_exams WHERE next_exam_date IS NOT NULL
    `);
    let expiredASO = 0;
    for (const aso of asoResults) {
      const examDate = new Date(aso.next_exam_date);
      if (examDate < now) expiredASO++;
    }

    const [laudoResults] = await db.query(`
      SELECT expiration_date FROM equipment_documents WHERE expiration_date IS NOT NULL AND document_type = 'laudo'
    `);
    let expiredLaudos = 0;
    for (const laudo of laudoResults) {
      const expDate = new Date(laudo.expiration_date);
      if (expDate < now) expiredLaudos++;
    }

    const [activeProjects] = await db.query("SELECT COUNT(*) as count FROM projects WHERE status = 'ativo' OR status = 'em_andamento'");

    const alerts = [];

    const [expiringCerts] = await db.query(`
      SELECT c.id, c.certificate_code, c.expiration_date, e.full_name as employee_name, t.name as training_name
      FROM certificates c
      LEFT JOIN employees e ON c.employee_id = e.id
      LEFT JOIN trainings t ON c.training_id = t.id
      WHERE c.status != 'cancelado'
    `);
    for (const cert of expiringCerts) {
      const expDate = new Date(cert.expiration_date);
      const daysUntil = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) {
        alerts.push({ type: 'certificado_vencido', severity: 'danger', message: `Certificado ${cert.certificate_code} de ${cert.employee_name} (${cert.training_name}) está vencido há ${Math.abs(daysUntil)} dias`, entity_id: cert.id });
      } else if (daysUntil <= alertDays) {
        alerts.push({ type: 'certificado_vencendo', severity: 'warning', message: `Certificado ${cert.certificate_code} de ${cert.employee_name} (${cert.training_name}) vence em ${daysUntil} dias`, entity_id: cert.id });
      }
    }

    for (const aso of asoResults) {
      const examDate = new Date(aso.next_exam_date);
      const daysUntil = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) {
        alerts.push({ type: 'aso_vencido', severity: 'danger', message: `ASO vencido há ${Math.abs(daysUntil)} dias` });
      }
    }

    for (const laudo of laudoResults) {
      const expDate = new Date(laudo.expiration_date);
      const daysUntil = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) {
        alerts.push({ type: 'laudo_vencido', severity: 'danger', message: `Laudo vencido há ${Math.abs(daysUntil)} dias` });
      }
    }

    res.json({
      activeEmployees: activeEmployees[0].count,
      validCertificates,
      expiringCertificates,
      expiredCertificates,
      expiredASO,
      totalEquipment: totalEquipment[0].count,
      totalCranes: totalCranes[0].count,
      expiredLaudos,
      activeProjects: activeProjects[0].count,
      totalCertificates: totalCertificates[0].count,
      cancelledCertificates: cancelledCertificates[0].count,
      totalClients: totalClients[0].count,
      alerts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

module.exports = router;
