const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }

    const user = users[0];
    
    if (user.status !== 'ativo') {
      return res.status(401).json({ error: 'Usuário inativo' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role, client_id: user.client_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        client_id: user.client_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao realizar login' });
  }
});

// POST /api/auth/register (admin only)
router.post('/register', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, email, password, role, client_id } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role, client_id) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, role || 'viewer', client_id || null]
    );

    res.status(201).json({ id: result.insertId, name, email, role: role || 'viewer' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Erro ao cadastrar usuário' });
  }
});

module.exports = router;
