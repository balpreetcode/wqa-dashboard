const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 7021;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Initialize database first, then start server
async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    console.log('Database initialized');

    // Initialize queue processor (after database)
    require('./queue/webqaProcessor');

    // Import routes (after database is ready)
    const runsRouter = require('./routes/runs');
    const healthRouter = require('./routes/health');

    // API Routes
    app.use('/api/runs', runsRouter);
    app.use('/api/health', healthRouter);

    // Error handler
    app.use((err, req, res, next) => {
      console.error('Error:', err);

      // Multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
      }

      if (err.message) {
        return res.status(400).json({ error: err.message });
      }

      res.status(500).json({ error: 'Internal server error' });
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`WQA Backend running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
