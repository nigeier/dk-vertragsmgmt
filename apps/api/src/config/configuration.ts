export default (): Record<string, unknown> => ({
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',

  // API
  api: {
    host: process.env.API_HOST || 'localhost',
    port: parseInt(process.env.API_PORT || '3001', 10),
    prefix: process.env.API_PREFIX || 'api/v1',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    name: process.env.DATABASE_NAME || 'drykorn_contracts',
    user: process.env.DATABASE_USER || 'drykorn',
    password: process.env.DATABASE_PASSWORD,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  // Security
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
    corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
  },

  // Rate Limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
});
