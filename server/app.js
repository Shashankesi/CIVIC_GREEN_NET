const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { NODE_ENV } = require('./config');
const requestId = require('./middleware/requestId');
const requestTimer = require('./middleware/requestTimer');
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const officerRoutes = require('./routes/officerRoutes');
const citizenRoutes = require('./routes/citizenRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const aiRoutes = require('./routes/aiRoutes');
const mapRoutes = require('./routes/mapRoutes');
const governanceRoutes = require('./routes/governanceRoutes');
const publicRoutes = require('./routes/publicRoutes');
const realtimeRoutes = require('./routes/realtimeRoutes');
const reputationRoutes = require('./routes/reputationRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.disable('x-powered-by');
app.disable('etag');

// ─── 1. Trust Proxy (Render runs behind a reverse proxy) ─────────────────────
app.set('trust proxy', 1);

// ─── 2. Security Headers (Helmet) ───────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://api.maptiler.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://api.maptiler.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://api.maptiler.com', 'https://*.tile.openstreetmap.org', 'https://*.tile.osm.org'],
        connectSrc: ["'self'", 'https://api.maptiler.com', 'https://res.cloudinary.com', 'https://generativelanguage.googleapis.com', 'https://api.groq.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  })
);

// ─── 3. CORS Configuration (MUST run before body parsers and routes) ─────────

// Known production origins (hardcoded fallback — always allowed)
const KNOWN_PRODUCTION_ORIGINS = [
  'https://civicgreennet.onrender.com'
];

const rawOrigins = [
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
  process.env.ALLOWED_ORIGINS,
  process.env.VITE_APP_URL,
  process.env.VITE_FRONTEND_URL
].filter(Boolean);

const configuredOrigins = rawOrigins
  .flatMap(o => String(o).split(','))
  .map(o => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// Auto-include apex and www for verified custom domain
if (configuredOrigins.some(o => o.includes('civicgreennet.dev'))) {
  if (!configuredOrigins.includes('https://civicgreennet.dev')) configuredOrigins.push('https://civicgreennet.dev');
  if (!configuredOrigins.includes('https://www.civicgreennet.dev')) configuredOrigins.push('https://www.civicgreennet.dev');
}

const devOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

// In production: configured origins + known production origins
// In development: all of the above + dev origins
const allowedOrigins = NODE_ENV === 'production'
  ? Array.from(new Set([...KNOWN_PRODUCTION_ORIGINS, ...configuredOrigins]))
  : Array.from(new Set([...KNOWN_PRODUCTION_ORIGINS, ...configuredOrigins, ...devOrigins]));

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization', 'X-Request-ID', 'X-Requested-With',
    'Accept', 'Origin', 'Cache-Control', 'Last-Event-ID'
  ],
  exposedHeaders: ['Content-Disposition', 'Content-Type', 'X-Request-ID'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // Cache preflight for 24 hours
};
app.use(cors(corsOptions));

// ─── 4. Request ID, Timing & Logging ────────────────────────────────────────
app.use(requestId);
app.use(requestTimer);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── 5. Health Check & Root Diagnostics (Bypass Rate Limiting) ──────────────
const handleHealthCheck = async (req, res) => {
  try {
    const db = require('./config/db');
    const start = Date.now();
    await db.query('SELECT 1');
    const latencyMs = Date.now() - start;

    const aiConfigured = !!(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
    const emailConfigured = !!process.env.RESEND_API_KEY;
    const cloudinaryConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);

    res.json({
      success: true,
      status: 'healthy',
      api: 'healthy',
      database: 'connected',
      postgis: 'healthy',
      email: {
        provider: 'resend',
        configured: emailConfigured,
        domain: 'civicgreennet.dev',
        status: emailConfigured ? 'operational' : 'not_configured'
      },
      optionalServices: {
        ai: aiConfigured ? 'healthy' : 'degraded',
        email: emailConfigured ? 'healthy' : 'degraded',
        smtp: emailConfigured ? 'healthy' : 'degraded',
        cloudinary: cloudinaryConfigured ? 'healthy' : 'degraded',
        scheduler: 'healthy'
      },
      latencyMs,
      timestamp: new Date().toISOString(),
      env: NODE_ENV
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      status: 'degraded',
      api: 'degraded',
      database: 'disconnected',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

const path = require('path');
const fs = require('fs');

const clientDist = path.resolve(__dirname, '../client/dist');
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'));

app.get('/health', handleHealthCheck);
app.get('/api/health', handleHealthCheck);

app.get('/', (req, res, next) => {
  if (hasClientBuild) {
    return res.sendFile(path.join(clientDist, 'index.html'));
  }
  res.json({
    name: 'Civic GreenNet API',
    status: 'online',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      public: '/api/public/stats',
      complaints: '/api/complaints',
      maps: '/api/maps'
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'Civic GreenNet API',
    status: 'online',
    version: '1.0.0',
    health: '/api/health',
    timestamp: new Date().toISOString()
  });
});

// ─── 6. Rate Limiters for Sensitive & General API Routes ────────────────────
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : (NODE_ENV === 'production' ? 600 : 5000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip health endpoints and preflight OPTIONS from rate limiting
    if (req.method === 'OPTIONS') return true;
    return req.path === '/health' || req.path === '/api/health' || req.originalUrl === '/api/health' || req.originalUrl === '/health';
  },
  message: { success: false, message: 'Too many requests, please try again shortly.' }
});

// Specific Auth rate limiter for brute-force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) : (NODE_ENV === 'production' ? 100 : 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot', authLimiter);

// General API rate limiter for resource endpoints
app.use('/api/', generalLimiter);

// Ensure all dynamic API responses are fresh and never cached stale by browsers or CDNs
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ─── 7. API Resource Routes ─────────────────────────────────────────────────
app.use('/api', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/citizen', citizenRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/reputation', reputationRoutes);

// Explicit 404 for unhandled API routes (never fall through to SPA index.html)
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint '${req.method} ${req.originalUrl}' not found.` });
});

// ─── 8. Production Static Assets & SPA Fallback ──────────────────────────────
if (hasClientBuild) {
  app.use(express.static(clientDist));

  // SPA fallback for all frontend routes (e.g. /officer, /admin, /impact, /admin/complaints/73)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ─── 9. Error Handler ───────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
