import { Controller, Get, Post, Body, Param, Res, HttpStatus, NotFoundException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { UrlShortenerService } from './url-shortener.service';

@Controller()
export class UrlShortenerController {
  private readonly logger = new Logger(UrlShortenerController.name);

  constructor(private readonly urlShortenerService: UrlShortenerService) {}

  @Post('url/shorten')
  async createShortUrl(@Body() body: { url: string }, @Res() res: Response) {
    try {
      if (!body.url) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'URL is required',
        });
      }

      const urlMapping = await this.urlShortenerService.createShortUrl(body.url);
      
      return res.status(HttpStatus.CREATED).json({
        originalUrl: urlMapping.originalUrl,
        shortUrl: urlMapping.shortUrl,
      });
    } catch (error) {
      this.logger.error(`Error creating short URL: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to create short URL',
      });
    }
  }

  @Get('r/:urlId')
  async redirectToOriginalUrl(@Param('urlId') urlId: string, @Res() res: Response) {
    try {
      const urlMapping = await this.urlShortenerService.getOriginalUrl(urlId);

      if (!urlMapping) {
        throw new NotFoundException('Short URL not found');
      }

      return res.redirect(urlMapping.originalUrl);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: error.message,
        });
      }

      this.logger.error(`Error redirecting URL: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to redirect',
      });
    }
  }

  @Get('url/stats/:id')
  async getUrlStats(@Param('id') id: string, @Res() res: Response) {
    try {
      const urlStats = await this.urlShortenerService.getUrlStats(id);

      if (!urlStats) {
        return res.status(HttpStatus.NOT_FOUND).json({
          message: 'URL not found',
        });
      }

      return res.status(HttpStatus.OK).json(urlStats);
    } catch (error) {
      this.logger.error(`Error getting URL stats: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to get URL stats',
      });
    }
  }

  @Get('url/list')
  async getAllUrls(@Res() res: Response) {
    try {
      const urls = await this.urlShortenerService.getAllUrlMappings();
      return res.status(HttpStatus.OK).json(urls);
    } catch (error) {
      this.logger.error(`Error getting all URLs: ${error.message}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to get URLs',
      });
    }
  }
} 