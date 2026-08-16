const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB: {
    // Support either individual env vars or a single DATABASE_URL (Neon/Supabase style)
    HOST: process.env.DB_HOST,
    PORT: process.env.DB_PORT,
    USER: process.env.DB_USER,
    PASSWORD: process.env.DB_PASSWORD,
    NAME: process.env.DB_NAME,
    URL: process.env.DATABASE_URL
  },
  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    ACCESS_EXP: process.env.JWT_ACCESS_EXP || '15m',
    REFRESH_EXP: process.env.JWT_REFRESH_EXP || '7d'
  },
  EMAIL: {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    PROVIDER: process.env.EMAIL_PROVIDER || 'resend',
    FROM: process.env.EMAIL_FROM || 'Civic GreenNet <notifications@civicgreennet.dev>',
    REPLY_TO: process.env.EMAIL_REPLY_TO || 'civicgreennet@gmail.com',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'civicgreennet@gmail.com'
  },
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: process.env.CLOUDINARY_API_KEY,
    API_SECRET: process.env.CLOUDINARY_API_SECRET
  },
  GEMINI: {
    API_KEY: process.env.GEMINI_API_KEY
  },
  GROQ: {
    API_KEY: process.env.GROQ_API_KEY
  },
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173'
};
