const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const [settings] = await db.query('SELECT * FROM system_settings LIMIT 1');
    if (settings.length === 0) {
      return res.json({ expiration_alert_days: 30, company_name: '', cnpj: '' });
    }
    res.json(settings[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configuracoes' });
  }
});

router.put('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const {
      company_name,
      cnpj,
      logo_url,
      address,
      email,
      phone,
      technical_responsible,
      crea_number,
      signature_url,
      expiration_alert_days,
      allow_public_pdf_view,
      report_footer
    } = req.body;

    const [existing] = await db.query('SELECT id FROM system_settings LIMIT 1');
    const values = [
      company_name,
      cnpj,
      logo_url,
      address,
      email,
      phone,
      technical_responsible,
      crea_number,
      signature_url,
      expiration_alert_days || 30,
      allow_public_pdf_view !== false,
      report_footer
    ];

    if (existing.length > 0) {
      await db.query(
        'UPDATE system_settings SET company_name=?, cnpj=?, logo_url=?, address=?, email=?, phone=?, technical_responsible=?, crea_number=?, signature_url=?, expiration_alert_days=?, allow_public_pdf_view=?, report_footer=? WHERE id=?',
        [...values, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO system_settings (company_name, cnpj, logo_url, address, email, phone, technical_responsible, crea_number, signature_url, expiration_alert_days, allow_public_pdf_view, report_footer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        values
      );
    }

    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update', 'settings', 1, 'Configuracoes do sistema atualizadas']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar configuracoes' });
  }
});

module.exports = router;
