import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectQueue('sms') private smsQueue: Queue,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health-check')
  healthCheck(): string {
    return 'OK';
  }

  @Get('health/queue')
  async getQueueHealth() {
    try {
      const waiting = await this.smsQueue.getWaiting();
      const active = await this.smsQueue.getActive();
      const completed = await this.smsQueue.getCompleted();
      const failed = await this.smsQueue.getFailed();
      
      return {
        status: 'healthy',
        queue: 'sms',
        counts: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        },
        jobs: {
          waiting: waiting.map(job => ({ id: job.id, data: job.data })),
          active: active.map(job => ({ id: job.id, data: job.data })),
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }
}
