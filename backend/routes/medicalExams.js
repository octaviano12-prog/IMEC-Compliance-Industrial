const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const [exams] = await db.query(`
      SELECT m.*, e.full_name as employee_name
      FROM medical_exams m
      LEFT JOIN employees e ON m.employee_id = e.id
      ORDER BY m.exam_date DESC
    `);
    res.json(exams);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar exames médicos' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [exams] = await db.query(`
      SELECT m.*, e.full_name as employee_name
      FROM medical_exams m
      LEFT JOIN employees e ON m.employee_id = e.id
      WHERE m.id = ?
    `, [req.params.id]);
    if (exams.length === 0) return res.status(404).json({ error: 'Exame médico não encontrado' });
    res.json(exams[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar exame médico' });
  }
});

router.post('/', authenticate, authorize('admin', 'rh', 'engenharia'), async (req, res) => {
  try {
    const { employee_id, exam_type, exam_date, next_exam_date, status, clinic_name, observations, document_url } = req.body;
    const [result] = await db.query(
      'INSERT INTO medical_exams (employee_id, exam_type, exam_date, next_exam_date, status, clinic_name, observations, document_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [employee_id, exam_type, exam_date, next_exam_date, status, clinic_name, observations, document_url]
    );
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create', 'medical_exam', result.insertId, `Exame médico cadastrado para funcionário ${employee_id}`]);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar exame médico' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'rh', 'engenharia'), async (req, res) => {
  try {
    const { employee_id, exam_type, exam_date, next_exam_date, status, clinic_name, observations, document_url } = req.body;
    await db.query(
      'UPDATE medical_exams SET employee_id=?, exam_type=?, exam_date=?, next_exam_date=?, status=?, clinic_name=?, observations=?, document_url=? WHERE id=?',
      [employee_id, exam_type, exam_date, next_exam_date, status, clinic_name, observations, document_url, req.params.id]
    );
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update', 'medical_exam', req.params.id, `Exame médico ${req.params.id} atualizado`]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar exame médico' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM medical_exams WHERE id = ?', [req.params.id]);
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'delete', 'medical_exam', req.params.id, `Exame médico ${req.params.id} excluído`]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir exame médico' });
  }
});

module.exports = router;
