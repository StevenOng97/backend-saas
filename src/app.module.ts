import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { getUpstashConnectionOptions } from './config/upstash.config';
import { InvitesModule } from './invites/invites.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // Check if we should use Upstash or local Redis
        if (configService.get('UPSTASH_REDIS_URL') && configService.get('UPSTASH_REDIS_TOKEN')) {
          return {
            redis: {
              ...getUpstashConnectionOptions(configService),
              port: parseInt(configService.get('UPSTASH_REDIS_PORT') || '6379'),
            },
          };
        }
        
        // Fallback to local Redis
        return {
          redis: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: parseInt(configService.get('REDIS_PORT') || '6379'),
          },
        };
      },
      inject: [ConfigService],
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    PrismaModule,
    InvitesModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
