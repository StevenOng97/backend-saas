import { Module } from '@nestjs/common';
import { UpgradeService } from './upgrade.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TwilioModule } from '../twilio/twilio.module';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [
    PrismaModule,
    TwilioModule,
    WorkersModule,
  ],
  providers: [UpgradeService],
  exports: [UpgradeService],
})
export class SubscriptionsModule {} 