const required = [
  // DB may be provided via DATABASE_URL; if so we accept it. Otherwise require DB_* vars
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS'
];

const missing = required.filter((k) => !process.env[k]);
// validate DB presence: accept DATABASE_URL or DB_* vars
const hasDb = !!(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME));
if (!hasDb) missing.push('DATABASE_URL or DB_HOST/DB_USER/DB_NAME');

if (missing.length) {
  console.error('Missing required environment variables:', missing.join(', '));
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

module.exports = { missing };
