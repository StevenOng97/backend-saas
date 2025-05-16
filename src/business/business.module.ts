import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BusinessOwnerGuard } from '../auth/guards';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessController],
  providers: [BusinessService, BusinessOwnerGuard],
  exports: [BusinessService],
})
export class BusinessModule {} 