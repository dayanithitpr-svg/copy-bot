const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const correlationId = require('./middleware/correlationId');
const requestLogger = require('./middleware/requestLogger');
const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');
const v1Router = require('./routes/v1');

const app = express();

// Trust reverse proxy if behind nginx/fly/render
app.set('trust proxy', 1);

// 1. Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: env.isProduction() ? undefined : false,
    crossOriginEmbedderPolicy: false
  })
);

// 2. CORS Configuration
const healthRoutes = require('./routes/v1/healthRoutes');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman), matching CLIENT_URL, or any localhost dev port (including IPv6 [::1])
    const isLocalhost = origin && /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
    if (!origin || origin === env.CLIENT_URL || isLocalhost || env.isDevelopment()) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy violation: origin ${origin} is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
};
app.use(cors(corsOptions));

// 3. Request Parsers
app.use(express.json({ limit: '10kb' })); // Mitigate oversized payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// 4. Observability & Tracking
app.use(correlationId);
app.use(requestLogger);

// Health check endpoint (exempt from global rate limiter to support continuous status polling)
app.use('/api/v1/health', healthRoutes);

// 5. Global Rate Limiter for all other API routes
app.use('/api/', globalLimiter);

// 6. Versioned API Routes
app.use('/api/v1', v1Router);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Crypto Copy Trading Platform API',
    version: '1.0.0',
    phase: 1,
    status: 'online',
    docs: '/api/v1/health'
  });
});

// 7. 404 Route Not Found
app.use(notFoundHandler);

// 8. Centralized Error Handler
app.use(errorHandler);

module.exports = app;
