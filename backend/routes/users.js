const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, status, client_id, created_at FROM users ORDER BY name');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, role, client_id } = req.body;
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, client_id) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role, client_id]
    );
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create', 'user', result.insertId, `Usuário ${name} cadastrado`]);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, role, status, client_id } = req.body;
    await db.query('UPDATE users SET name=?, email=?, role=?, status=?, client_id=? WHERE id=?',
      [name, email, role, status, client_id, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id = ? AND id != ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
