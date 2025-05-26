import { Prisma } from '@prisma/client';

export class UrlMapping {
  id: string;
  originalUrl: string;
  shortUrl: string;
  urlId: string;
  createdAt: Date;
  clicks: number;
}

export type UrlMappingCreateInput = Omit<UrlMapping, 'id' | 'createdAt' | 'clicks'>; 