import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { UrlShortenerModule } from '../url-shortener/url-shortener.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    UrlShortenerModule,
  ],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {} 