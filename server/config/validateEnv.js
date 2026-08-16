const requiredSecrets = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'RESEND_API_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
];

const missing = [];

// 1. Check required secrets
for (const key of requiredSecrets) {
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    missing.push(key);
  }
}

// 2. Validate DB presence: accept DATABASE_URL or DB_* vars
const hasDb = !!(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME));
if (!hasDb) missing.push('DATABASE_URL (or DB_HOST, DB_USER, DB_NAME)');

// 3. In production, also require FRONTEND_URL and verify strong secrets
if (process.env.NODE_ENV === 'production') {
  if (!process.env.FRONTEND_URL && !process.env.CLIENT_URL && !process.env.ALLOWED_ORIGINS) {
    missing.push('FRONTEND_URL (or CLIENT_URL)');
  }
  if (process.env.JWT_ACCESS_SECRET === 'dev-access-secret' || process.env.JWT_ACCESS_SECRET === 'replace_with_secure_random') {
    missing.push('JWT_ACCESS_SECRET (insecure placeholder detected in production)');
  }
  if (process.env.JWT_REFRESH_SECRET === 'dev-refresh-secret' || process.env.JWT_REFRESH_SECRET === 'replace_with_secure_random') {
    missing.push('JWT_REFRESH_SECRET (insecure placeholder detected in production)');
  }
}

if (missing.length > 0) {
  console.error('[CONFIG VALIDATION] Missing or insecure environment variables:', missing.join(', '));
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

function maskApiKey(key) {
  if (!key || typeof key !== 'string') return '(none)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 5)}****${key.slice(-4)}`;
}

// Diagnostic summary for startup logging (safe and masked)
const emailConfigSummary = {
  provider: process.env.EMAIL_PROVIDER || 'resend',
  from: process.env.EMAIL_FROM || 'Civic GreenNet <notifications@civicgreennet.dev>',
  replyTo: process.env.EMAIL_REPLY_TO || 'civicgreennet@gmail.com',
  apiKeyMasked: maskApiKey(process.env.RESEND_API_KEY)
};

module.exports = { missing, emailConfigSummary, maskApiKey };
