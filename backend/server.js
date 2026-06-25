require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDir = path.join(__dirname, '../frontend');
const indexFile = path.join(frontendDir, 'index.html');

function sendFrontendApp(req, res, next) {
  fs.readFile(indexFile, 'utf8', (err, html) => {
    if (err) return next(err);

    const enhancedHtml = html
      .replace('</head>', '<link rel="stylesheet" href="/pro-dashboard.css">\n</head>')
      .replace('</body>', '<script src="/pro-dashboard.js"></script>\n</body>');

    res.type('html').send(enhancedHtml);
  });
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Muitas requisições, tente novamente mais tarde'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('dev'));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend
app.get('/', sendFrontendApp);
app.use(express.static(frontendDir, { index: false }));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/trainings', require('./routes/trainings'));
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/medical-exams', require('./routes/medicalExams'));
app.use('/api/epi', require('./routes/epi'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/equipment-documents', require('./routes/equipmentDocuments'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/technical-documents', require('./routes/technicalDocuments'));
app.use('/api/competency', require('./routes/competency'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/upload', require('./routes/upload'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    return sendFrontendApp(req, res, next);
  }
  next();
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 IMEC Compliance Industrial API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
