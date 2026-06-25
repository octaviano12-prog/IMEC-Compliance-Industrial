const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM competency_requirements ORDER BY name');
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar requisitos de competência' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM competency_requirements WHERE id = ?', [req.params.id]);
    if (items.length === 0) return res.status(404).json({ error: 'Requisito de competência não encontrado' });
    res.json(items[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar requisito de competência' });
  }
});

router.post('/', authenticate, authorize('admin', 'rh', 'engenharia'), async (req, res) => {
  try {
    const { name, description, required_training, required_certification, validity_months, role_position, status } = req.body;
    const [result] = await db.query(
      'INSERT INTO competency_requirements (name, description, required_training, required_certification, validity_months, role_position, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, required_training, required_certification, validity_months, role_position, status || 'ativo']
    );
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create', 'competency', result.insertId, `Requisito de competência ${name} cadastrado`]);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar requisito de competência' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'rh', 'engenharia'), async (req, res) => {
  try {
    const { name, description, required_training, required_certification, validity_months, role_position, status } = req.body;
    await db.query(
      'UPDATE competency_requirements SET name=?, description=?, required_training=?, required_certification=?, validity_months=?, role_position=?, status=? WHERE id=?',
      [name, description, required_training, required_certification, validity_months, role_position, status, req.params.id]
    );
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update', 'competency', req.params.id, `Requisito de competência ${name} atualizado`]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar requisito de competência' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [item] = await db.query('SELECT name FROM competency_requirements WHERE id = ?', [req.params.id]);
    await db.query('DELETE FROM competency_requirements WHERE id = ?', [req.params.id]);
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'delete', 'competency', req.params.id, `Requisito de competência ${item[0]?.name} excluído`]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir requisito de competência' });
  }
});

module.exports = router;
