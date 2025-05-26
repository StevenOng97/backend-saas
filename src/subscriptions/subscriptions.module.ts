import { Module } from '@nestjs/common';
import { UpgradeService } from './upgrade.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TwilioModule } from '../twilio/twilio.module';

@Module({
  imports: [
    PrismaModule,
    TwilioModule,
  ],
  providers: [UpgradeService],
  exports: [UpgradeService],
})
export class SubscriptionsModule {} 