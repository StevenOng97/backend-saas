import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { SmsModule } from '../sms/sms.module';
import { MailModule } from '../mail/mail.module';
import { WorkersModule } from '../workers/workers.module';

@Module({
  imports: [
    // Import WorkersModule to access registered queues
    WorkersModule,
    SmsModule,
    MailModule,
  ],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {} 