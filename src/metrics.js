const promClient = require('prom-client');
const express = require('express');

// Advanced Prometheus metrics for expert-level monitoring
const register = new promClient.Registry();

// Custom business metrics
const businessMetrics = {
  // User engagement metrics
  userSessions: new promClient.Counter({
    name: 'user_sessions_total',
    help: 'Total number of user sessions',
    labelNames: ['user_type', 'session_duration_bucket']
  }),
  
  // API performance metrics
  apiLatency: new promClient.Histogram({
    name: 'api_request_duration_seconds',
    help: 'API request duration in seconds',
    labelNames: ['method', 'endpoint', 'status_code', 'environment'],
    buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  }),
  
  // Business KPIs
  activeUsers: new promClient.Gauge({
    name: 'active_users_current',
    help: 'Current number of active users'
  }),
  
  // Error tracking
  errorRate: new promClient.Counter({
    name: 'application_errors_total',
    help: 'Total application errors',
    labelNames: ['error_type', 'severity', 'component']
  }),
  
  // Resource utilization
  memoryUsage: new promClient.Gauge({
    name: 'application_memory_usage_bytes',
    help: 'Application memory usage in bytes',
    labelNames: ['type'] // heap, external, rss
  }),
  
  // Database metrics
  dbConnections: new promClient.Gauge({
    name: 'database_connections_active',
    help: 'Active database connections',
    labelNames: ['database', 'state']
  }),
  
  // Cache metrics
  cacheHitRate: new promClient.Counter({
    name: 'cache_operations_total',
    help: 'Cache operations',
    labelNames: ['operation', 'result'] // hit, miss, error
  }),
  
  // Custom business events
  businessEvents: new promClient.Counter({
    name: 'business_events_total',
    help: 'Business events',
    labelNames: ['event_type', 'user_segment']
  })
};

// Register all metrics
Object.values(businessMetrics).forEach(metric => register.registerMetric(metric));

// Advanced metrics collection middleware
const advancedMetricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = (Date.now() - start) / 1000;
    
    // Record API metrics
    businessMetrics.apiLatency.observe({
      method: req.method,
      endpoint: req.route?.path || req.path,
      status_code: res.statusCode,
      environment: process.env.NODE_ENV || 'development'
    }, duration);
    
    // Record error metrics
    if (res.statusCode >= 400) {
      businessMetrics.errorRate.inc({
        error_type: res.statusCode >= 500 ? 'server_error' : 'client_error',
        severity: res.statusCode >= 500 ? 'high' : 'medium',
        component: 'api'
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Metrics collection functions
const metricsCollector = {
  recordUserSession: (userType, duration) => {
    businessMetrics.userSessions.inc({
      user_type: userType,
      session_duration_bucket: getDurationBucket(duration)
    });
  },
  
  recordActiveUsers: (count) => {
    businessMetrics.activeUsers.set(count);
  },
  
  recordMemoryUsage: () => {
    const memUsage = process.memoryUsage();
    businessMetrics.memoryUsage.set({ type: 'heap' }, memUsage.heapUsed);
    businessMetrics.memoryUsage.set({ type: 'external' }, memUsage.external);
    businessMetrics.memoryUsage.set({ type: 'rss' }, memUsage.rss);
  },
  
  recordDatabaseConnection: (database, state) => {
    businessMetrics.dbConnections.set({ database, state }, 1);
  },
  
  recordCacheOperation: (operation, result) => {
    businessMetrics.cacheHitRate.inc({ operation, result });
  },
  
  recordBusinessEvent: (eventType, userSegment) => {
    businessMetrics.businessEvents.inc({ event_type: eventType, user_segment: userSegment });
  }
};

// Helper function for duration buckets
function getDurationBucket(duration) {
  if (duration < 60) return 'short';
  if (duration < 300) return 'medium';
  if (duration < 900) return 'long';
  return 'very_long';
}

// Start metrics collection
setInterval(() => {
  metricsCollector.recordMemoryUsage();
}, 5000);

module.exports = {
  register,
  businessMetrics,
  advancedMetricsMiddleware,
  metricsCollector
};
