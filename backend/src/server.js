const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../docs/swagger.json');
const { initializeDatabase } = require('./models/database');

const applicationRoutes = require('./routes/applicationRoutes');
const statusRoutes = require('./routes/statusRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend')));

// API Routes
app.use('/api/auth', userRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/statuses', statusRoutes);

// Swagger UI — reads from external swagger.json, no inline docs in routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve SPA for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize DB then start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Job Tracker API running at http://localhost:${PORT}`);
      console.log(`📖 Swagger docs at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

module.exports = app;
