import { registerAs } from '@nestjs/config';

export default registerAs('keycloak', () => ({
  url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
  realm: process.env.KEYCLOAK_REALM || 'drykorn-contracts',
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'contract-management',
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
  // Keycloak public key for token verification (optional, fetched automatically)
  publicKey: process.env.KEYCLOAK_PUBLIC_KEY,
  // Admin credentials for user sync
  adminUser: process.env.KEYCLOAK_ADMIN_USER || 'admin',
  adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD,
}));
