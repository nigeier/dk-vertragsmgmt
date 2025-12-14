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

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    url: process.env.REDIS_URL,
  },

  // MinIO
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucketName: process.env.MINIO_BUCKET_NAME || 'drykorn-contracts',
  },

  // Keycloak
  keycloak: {
    url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'drykorn-contracts',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'contract-management',
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
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
