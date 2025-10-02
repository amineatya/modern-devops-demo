const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const promClient = require('prom-client');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const redis = require('redis');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
require('dotenv').config();
require('express-async-errors');

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// LOGGING CONFIGURATION
// =============================================================================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cicd-demo-app' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// =============================================================================
// PROMETHEUS METRICS
// =============================================================================
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);

// =============================================================================
// REDIS CONNECTION
// =============================================================================
let redisClient;
if (process.env.REDIS_URL) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL
  });
  redisClient.on('error', (err) => logger.error('Redis Client Error', err));
  redisClient.connect().catch(err => logger.error('Redis connection failed:', err));
}

// =============================================================================
// MONGODB CONNECTION
// =============================================================================
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Connected to MongoDB'))
    .catch(err => logger.error('MongoDB connection failed:', err));
}

// =============================================================================
// SWAGGER DOCUMENTATION
// =============================================================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CI/CD Demo API',
      version: '1.0.0',
      description: 'Enterprise-grade API demonstrating advanced DevOps practices',
      contact: {
        name: 'Amine Atya',
        email: 'amine@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/app.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// =============================================================================
// MIDDLEWARE CONFIGURATION
// =============================================================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}s`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// =============================================================================
// API ROUTES
// =============================================================================

/**
 * @swagger
 * /healthz:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 version:
 *                   type: string
 *                 environment:
 *                   type: string
 *                 metrics:
 *                   type: object
 */
app.get('/healthz', async (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    metrics: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      activeConnections: activeConnections.get()
    }
  };

  // Check external dependencies
  if (redisClient) {
    try {
      await redisClient.ping();
      healthCheck.redis = 'connected';
    } catch (err) {
      healthCheck.redis = 'disconnected';
      healthCheck.status = 'degraded';
    }
  }

  if (mongoose.connection.readyState === 1) {
    healthCheck.mongodb = 'connected';
  } else {
    healthCheck.mongodb = 'disconnected';
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 */
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: API information
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API information
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Enterprise CI/CD Demo Application',
    version: '1.0.0',
    description: 'Advanced DevOps demonstration with monitoring, security, and scalability features',
    author: 'Amine Atya',
    features: [
      'Prometheus Metrics',
      'Structured Logging',
      'Rate Limiting',
      'Security Headers',
      'API Documentation',
      'Health Checks',
      'Redis Caching',
      'MongoDB Integration',
      'JWT Authentication',
      'Load Testing Support'
    ],
    endpoints: {
      health: '/healthz',
      metrics: '/metrics',
      api: '/api/v1',
      docs: '/api-docs'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @swagger
 * /api/v1/status:
 *   get:
 *     summary: Service status
 *     tags: [API]
 *     responses:
 *       200:
 *         description: Service status information
 */
app.get('/api/v1/status', (req, res) => {
  res.json({
    service: 'cicd-demo-app',
    status: 'running',
    environment: process.env.NODE_ENV || 'development',
    build: process.env.BUILD_NUMBER || 'local',
    commit: process.env.GIT_COMMIT || 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 */
app.post('/api/v1/users', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;
  
  // Simulate user creation (in real app, save to database)
  const user = {
    id: Date.now(),
    username,
    email,
    createdAt: new Date().toISOString()
  };

  logger.info('User created', { userId: user.id, username });
  res.status(201).json({ message: 'User created successfully', user });
});

/**
 * @swagger
 * /api/v1/cache/{key}:
 *   get:
 *     summary: Get cached value
 *     tags: [Cache]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cached value retrieved
 *       404:
 *         description: Key not found
 */
app.get('/api/v1/cache/:key', async (req, res) => {
  if (!redisClient) {
    return res.status(503).json({ error: 'Redis not available' });
  }

  try {
    const value = await redisClient.get(req.params.key);
    if (value) {
      res.json({ key: req.params.key, value: JSON.parse(value) });
    } else {
      res.status(404).json({ error: 'Key not found' });
    }
  } catch (err) {
    logger.error('Redis GET error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/v1/cache/{key}:
 *   post:
 *     summary: Set cached value
 *     tags: [Cache]
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Value cached successfully
 */
app.post('/api/v1/cache/:key', [
  body('value').notEmpty()
], async (req, res) => {
  if (!redisClient) {
    return res.status(503).json({ error: 'Redis not available' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    await redisClient.setEx(req.params.key, 3600, JSON.stringify(req.body.value));
    res.json({ message: 'Value cached successfully', key: req.params.key });
  } catch (err) {
    logger.error('Redis SET error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// =============================================================================
// START SERVER
// =============================================================================
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Enterprise CI/CD Demo App running on port ${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/healthz`);
    logger.info(`📈 Metrics: http://localhost:${PORT}/metrics`);
    logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
    logger.info(`🌐 API info: http://localhost:${PORT}/`);
    
    // Update active connections metric
    setInterval(() => {
      activeConnections.set(server.connections);
    }, 1000);
  });
}

module.exports = app;