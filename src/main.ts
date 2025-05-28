import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS with credentials
  app.enableCors({
    origin: true,
    // origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'https://0676-2402-800-62a7-9663-b5e9-aa8c-8678-e5df.ngrok-free.app'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
  app.useGlobalInterceptors(new LoggingInterceptor());
  
  // Use cookie parser middleware
  app.use(cookieParser());
  
  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  const port = process.env.PORT || 4200;
  
  await app.listen(port);
  
  logger.log(`Application is running on port ${port}`);
  logger.log('All modules initialized, including queue processors');
}
bootstrap();
