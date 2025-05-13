import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { InviteLimitMiddleware } from '../middleware/invite-limit.middleware';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'sms',
    }),
    SmsModule,
  ],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware, InviteLimitMiddleware)
      .forRoutes(InvitesController);
  }
} 