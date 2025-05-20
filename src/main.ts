import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS with credentials
  app.enableCors({
    origin: true,
    // origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'https://0676-2402-800-62a7-9663-b5e9-aa8c-8678-e5df.ngrok-free.app'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  
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
  
  await app.listen(process.env.PORT ?? 4200, '0.0.0.0');
  console.log(`Application running on ${process.env.BACKEND_URL}`);
}
bootstrap();
