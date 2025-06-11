import { Module } from '@nestjs/common';
import { GoogleMyBusinessService } from './google-my-business.service';
import { GoogleMyBusinessController } from './google-my-business.controller';
import { GoogleMyBusinessProcessor } from './google-my-business.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkersModule } from '../workers/workers.module';
@Module({
  imports: [
    PrismaModule,
    WorkersModule,
  ],
  controllers: [GoogleMyBusinessController],
  providers: [GoogleMyBusinessService, GoogleMyBusinessProcessor],
  exports: [GoogleMyBusinessService],
})
export class GoogleMyBusinessModule {} 