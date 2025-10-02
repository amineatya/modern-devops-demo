const opentracing = require('opentracing');
const jaeger = require('jaeger-client');
const express = require('express');

// Initialize Jaeger tracer
const initTracer = (serviceName) => {
  const config = {
    serviceName: serviceName,
    sampler: {
      type: 'const',
      param: 1,
    },
    reporter: {
      logSpans: true,
      agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
      agentPort: process.env.JAEGER_AGENT_PORT || 6832,
    },
  };
  
  const options = {
    logger: {
      info(msg) {
        console.log('INFO:', msg);
      },
      error(msg) {
        console.log('ERROR:', msg);
      },
    },
  };
  
  return jaeger.initTracer(config, options);
};

// Create tracer instance
const tracer = initTracer('modern-devops-demo');

// Tracing middleware for Express
const tracingMiddleware = (req, res, next) => {
  const span = tracer.startSpan(`${req.method} ${req.path}`);
  
  // Add tags to span
  span.setTag('http.method', req.method);
  span.setTag('http.url', req.url);
  span.setTag('user_agent', req.get('User-Agent'));
  span.setTag('client_ip', req.ip);
  
  // Add span to request context
  req.span = span;
  
  // Finish span when response is sent
  res.on('finish', () => {
    span.setTag('http.status_code', res.statusCode);
    span.finish();
  });
  
  next();
};

// Database tracing wrapper
const traceDatabaseOperation = (operation, operationName) => {
  return async (query, params) => {
    const span = tracer.startSpan(`db.${operationName}`, {
      tags: {
        'db.operation': operationName,
        'db.query': query.substring(0, 100), // Truncate long queries
      }
    });
    
    try {
      const result = await operation(query, params);
      span.setTag('db.rows_affected', result.affectedRows || 0);
      span.finish();
      return result;
    } catch (error) {
      span.setTag('error', true);
      span.setTag('error.message', error.message);
      span.finish();
      throw error;
    }
  };
};

// Cache tracing wrapper
const traceCacheOperation = (operation, operationName) => {
  return async (key, value) => {
    const span = tracer.startSpan(`cache.${operationName}`, {
      tags: {
        'cache.operation': operationName,
        'cache.key': key,
      }
    });
    
    try {
      const result = await operation(key, value);
      span.setTag('cache.hit', result !== null);
      span.finish();
      return result;
    } catch (error) {
      span.setTag('error', true);
      span.setTag('error.message', error.message);
      span.finish();
      throw error;
    }
  };
};

// External API tracing wrapper
const traceExternalAPI = (operation, serviceName, endpoint) => {
  return async (data) => {
    const span = tracer.startSpan(`external.${serviceName}`, {
      tags: {
        'external.service': serviceName,
        'external.endpoint': endpoint,
      }
    });
    
    try {
      const result = await operation(data);
      span.setTag('external.status_code', result.status || 200);
      span.finish();
      return result;
    } catch (error) {
      span.setTag('error', true);
      span.setTag('error.message', error.message);
      span.finish();
      throw error;
    }
  };
};

// Business operation tracing
const traceBusinessOperation = (operation, operationName) => {
  return async (data) => {
    const span = tracer.startSpan(`business.${operationName}`, {
      tags: {
        'business.operation': operationName,
        'business.user_id': data.userId,
      }
    });
    
    try {
      const result = await operation(data);
      span.setTag('business.success', true);
      span.finish();
      return result;
    } catch (error) {
      span.setTag('business.success', false);
      span.setTag('error', true);
      span.setTag('error.message', error.message);
      span.finish();
      throw error;
    }
  };
};

// Create child span helper
const createChildSpan = (parentSpan, operationName, tags = {}) => {
  const span = tracer.startSpan(operationName, {
    childOf: parentSpan,
    tags: tags
  });
  return span;
};

// Trace context propagation
const extractTraceContext = (headers) => {
  return tracer.extract(opentracing.FORMAT_HTTP_HEADERS, headers);
};

const injectTraceContext = (span, headers) => {
  tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, headers);
  return headers;
};

module.exports = {
  tracer,
  tracingMiddleware,
  traceDatabaseOperation,
  traceCacheOperation,
  traceExternalAPI,
  traceBusinessOperation,
  createChildSpan,
  extractTraceContext,
  injectTraceContext
};
