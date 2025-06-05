import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { GoogleMyBusinessService } from './google-my-business.service';
import { GoogleMyBusinessController } from './google-my-business.controller';
import { GoogleMyBusinessProcessor } from './google-my-business.processor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'google-my-business',
    }),
  ],
  controllers: [GoogleMyBusinessController],
  providers: [GoogleMyBusinessService, GoogleMyBusinessProcessor],
  exports: [GoogleMyBusinessService],
})
export class GoogleMyBusinessModule {} 