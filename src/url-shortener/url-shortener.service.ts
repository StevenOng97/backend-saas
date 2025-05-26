import { Injectable, Logger } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';
import { UrlMapping, UrlMappingCreateInput } from './url-shortener.model';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UrlShortenerService {
  private readonly logger = new Logger(UrlShortenerService.name);
  private readonly baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
  }

  /**
   * Create a new short URL
   */
  async createShortUrl(originalUrl: string): Promise<UrlMapping> {
    // Check if URL already exists in database
    const existingUrl = await this.prisma.urlMapping.findFirst({
      where: { originalUrl },
    });

    if (existingUrl) {
      this.logger.log(`Returning existing short URL for ${originalUrl}`);
      return existingUrl as UrlMapping;
    }

    // Generate a unique ID for the short URL
    const urlId = nanoid(8); // 8 character ID
    const shortUrl = `${this.baseUrl}/r/${urlId}`;

    // Create a new URL mapping
    const urlMapping = await this.prisma.urlMapping.create({
      data: {
        originalUrl,
        shortUrl,
        urlId,
      },
    });

    this.logger.log(`Created short URL ${shortUrl} for ${originalUrl}`);
    return urlMapping as UrlMapping;
  }

  /**
   * Get the original URL by its ID
   */
  async getOriginalUrl(urlId: string): Promise<UrlMapping | null> {
    const urlMapping = await this.prisma.urlMapping.findUnique({
      where: { urlId },
    });

    if (!urlMapping) {
      this.logger.warn(`URL with ID ${urlId} not found`);
      return null;
    }

    // Increment the click count
    await this.prisma.urlMapping.update({
      where: { id: urlMapping.id },
      data: { clicks: { increment: 1 } },
    });

    this.logger.log(`Redirecting ${urlId} to ${urlMapping.originalUrl}`);
    return urlMapping as UrlMapping;
  }

  /**
   * Get URL mapping by ID
   */
  async getUrlMappingById(id: string): Promise<UrlMapping | null> {
    const result = await this.prisma.urlMapping.findUnique({
      where: { id },
    });
    return result as UrlMapping | null;
  }

  /**
   * Get all URL mappings
   */
  async getAllUrlMappings(skip = 0, take = 20): Promise<UrlMapping[]> {
    const results = await this.prisma.urlMapping.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
    return results as UrlMapping[];
  }

  /**
   * Get URL stats by ID
   */
  async getUrlStats(id: string): Promise<UrlMapping | null> {
    const result = await this.prisma.urlMapping.findUnique({
      where: { id },
    });
    return result as UrlMapping | null;
  }

  /**
   * Delete URL mapping by ID
   */
  async deleteUrlMapping(id: string): Promise<void> {
    await this.prisma.urlMapping.delete({
      where: { id },
    });
  }
} 