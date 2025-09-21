const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CI/CD Demo Application',
    version: '1.0.0',
    description: 'A simple application to demonstrate CI/CD pipeline',
    endpoints: {
      health: '/healthz',
      api: '/api/v1'
    }
  });
});

// API routes
app.get('/api/v1/status', (req, res) => {
  res.json({
    service: 'cicd-demo-app',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    build: process.env.BUILD_NUMBER || 'local',
    commit: process.env.GIT_COMMIT || 'unknown'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CI/CD Demo App running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/healthz`);
    console.log(`🌐 API info: http://localhost:${PORT}/`);
  });
}

module.exports = app;
