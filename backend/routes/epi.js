const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const [epis] = await db.query(`
      SELECT ep.*, e.full_name as employee_name
      FROM epis ep
      LEFT JOIN employees e ON ep.employee_id = e.id
      ORDER BY ep.delivery_date DESC
    `);
    res.json(epis);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar EPIs' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [epis] = await db.query(`
      SELECT ep.*, e.full_name as employee_name
      FROM epis ep
      LEFT JOIN employees e ON ep.employee_id = e.id
      WHERE ep.id = ?
    `, [req.params.id]);
    if (epis.length === 0) return res.status(404).json({ error: 'EPI não encontrado' });
    res.json(epis[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar EPI' });
  }
});

router.post('/', authenticate, authorize('admin', 'rh', 'engenharia'), async (req, res) => {
  try {
    const { employee_id, epi_type, description, ca_number, delivery_date, return_date, status, observations } = req.body;
    const [result] = await db.query(
      'INSERT INTO epis (employee_id, epi_type, description, ca_number, delivery_date, return_date, status, observations) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [employee_id, epi_type, description, ca_number, delivery_date, return_date, status, observations]
    );
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create', 'epi', result.insertId, `EPI cadastrado para funcionário ${employee_id}`]);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar EPI' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'rh', 'engenharia'), async (req, res) => {
  try {
    const { employee_id, epi_type, description, ca_number, delivery_date, return_date, status, observations } = req.body;
    await db.query(
      'UPDATE epis SET employee_id=?, epi_type=?, description=?, ca_number=?, delivery_date=?, return_date=?, status=?, observations=? WHERE id=?',
      [employee_id, epi_type, description, ca_number, delivery_date, return_date, status, observations, req.params.id]
    );
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update', 'epi', req.params.id, `EPI ${req.params.id} atualizado`]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar EPI' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM epis WHERE id = ?', [req.params.id]);
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'delete', 'epi', req.params.id, `EPI ${req.params.id} excluído`]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir EPI' });
  }
});

module.exports = router;
