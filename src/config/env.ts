import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Environment variable schema with validation
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  
  // Database
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // Stream Chat
  STREAM_API_KEY: z.string().min(1, 'STREAM_API_KEY is required'),
  STREAM_API_SECRET: z.string().min(1, 'STREAM_API_SECRET is required'),
  
  // Publishing
  PUBLISH_SECRET: z.string().min(16, 'PUBLISH_SECRET must be at least 16 characters'),
  
  // Optional services
  REDIS_URL: z.string().optional(),
  PUSH_SERVICE_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  ADMIN_API_KEY: z.string().optional(),
  
  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();

// Export typed environment variables
export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  
  database: {
    uri: env.MONGODB_URI,
  },
  
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },
  
  stream: {
    apiKey: env.STREAM_API_KEY,
    apiSecret: env.STREAM_API_SECRET,
  },
  
  publish: {
    secret: env.PUBLISH_SECRET,
  },
  
  redis: {
    url: env.REDIS_URL,
  },
  
  push: {
    serviceKey: env.PUSH_SERVICE_KEY,
  },
  
  sentry: {
    dsn: env.SENTRY_DSN,
  },
  
  admin: {
    apiKey: env.ADMIN_API_KEY,
  },
  
  cors: {
    allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
  },
} as const;