const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const [docs] = await db.query(`
      SELECT td.*, c.name as client_name, p.name as project_name
      FROM technical_documents td
      LEFT JOIN clients c ON td.client_id = c.id
      LEFT JOIN projects p ON td.project_id = p.id
      ORDER BY td.created_at DESC
    `);
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar documentos técnicos' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const [docs] = await db.query(`
      SELECT td.*, c.name as client_name, p.name as project_name
      FROM technical_documents td
      LEFT JOIN clients c ON td.client_id = c.id
      LEFT JOIN projects p ON td.project_id = p.id
      WHERE td.id = ?
    `, [req.params.id]);
    if (docs.length === 0) return res.status(404).json({ error: 'Documento técnico não encontrado' });
    res.json(docs[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar documento técnico' });
  }
});

router.post('/', authenticate, authorize('admin', 'rh', 'engenharia'), async (req, res) => {
  try {
    const { client_id, project_id, document_type, document_number, description, issue_date, expiration_date, file_url, technical_responsible, crea_number, status, notes } = req.body;
    const [result] = await db.query(
      'INSERT INTO technical_documents (client_id, project_id, document_type, document_number, description, issue_date, expiration_date, file_url, technical_responsible, crea_number, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [client_id, project_id, document_type, document_number, description, issue_date, expiration_date, file_url, technical_responsible, crea_number, status, notes]
    );
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create', 'technical_document', result.insertId, `Documento técnico ${document_type} cadastrado`]);
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar documento técnico' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'rh', 'engenharia'), async (req, res) => {
  try {
    const { client_id, project_id, document_type, document_number, description, issue_date, expiration_date, file_url, technical_responsible, crea_number, status, notes } = req.body;
    await db.query(
      'UPDATE technical_documents SET client_id=?, project_id=?, document_type=?, document_number=?, description=?, issue_date=?, expiration_date=?, file_url=?, technical_responsible=?, crea_number=?, status=?, notes=? WHERE id=?',
      [client_id, project_id, document_type, document_number, description, issue_date, expiration_date, file_url, technical_responsible, crea_number, status, notes, req.params.id]
    );
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'update', 'technical_document', req.params.id, `Documento técnico ${req.params.id} atualizado`]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar documento técnico' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM technical_documents WHERE id = ?', [req.params.id]);
    await db.query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'delete', 'technical_document', req.params.id, `Documento técnico ${req.params.id} excluído`]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir documento técnico' });
  }
});

module.exports = router;
