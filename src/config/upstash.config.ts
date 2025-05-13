import { Redis } from '@upstash/redis';
import { ConfigService } from '@nestjs/config';

/**
 * Create and configure Upstash Redis client
 * @param configService Optional ConfigService instance
 * @returns Configured Redis client
 */
export const createUpstashRedisClient = (
  configService?: ConfigService,
): Redis => {
  // Get configuration from environment variables directly or through ConfigService
  const url = configService
    ? configService.get<string>('UPSTASH_REDIS_URL')
    : process.env.UPSTASH_REDIS_URL;

  const token = configService
    ? configService.get<string>('UPSTASH_REDIS_TOKEN')
    : process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Upstash Redis URL and token must be provided in environment variables',
    );
  }

  // Create and return Redis client
  return new Redis({
    url,
    token,
  });
};

/**
 * Get BullMQ connection options for Upstash Redis
 * @param configService Optional ConfigService instance
 * @returns Connection options for BullMQ
 */
export const getUpstashConnectionOptions = (configService?: ConfigService) => {
  const host = configService
    ? configService.get<string>('UPSTASH_REDIS_URL')
    : process.env.UPSTASH_REDIS_URL || '';

  const password = configService
    ? configService.get<string>('UPSTASH_REDIS_TOKEN')
    : process.env.UPSTASH_REDIS_TOKEN || '';

  const port = configService
    ? configService.get<string>('UPSTASH_REDIS_PORT')
    : process.env.UPSTASH_REDIS_PORT || '6379';

  return {
    host,
    port,
    password,
    tls: {},
  };
};
