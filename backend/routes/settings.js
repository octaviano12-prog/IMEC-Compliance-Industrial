const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const [settings] = await db.query('SELECT * FROM system_settings LIMIT 1');
    if (settings.length === 0) {
      return res.json({ expiration_alert_days: 30, company_name: '', company_cnpj: '' });
    }
    res.json(settings[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

router.put('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { expiration_alert_days, company_name, company_cnpj, company_address, company_phone, company_email, logo_url } = req.body;
    const [existing] = await db.query('SELECT id FROM system_settings LIMIT 1');
    if (existing.length > 0) {
      await db.query(
        'UPDATE system_settings SET expiration_alert_days=?, company_name=?, company_cnpj=?, company_address=?, company_phone=?, company_email=?, logo_url=? WHERE id=?',
        [expiration_alert_days, company_name, company_cnpj, company_address, company_phone, company_email, logo_url, existing[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO system_settings (expiration_alert_days, company_name, company_cnpj, company_address, company_phone, company_email, logo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [expiration_alert_days, company_name, company_cnpj, company_address, company_phone, company_email, logo_url]
      );
    }
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update', 'settings', 1, 'Configurações do sistema atualizadas']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

module.exports = router;
