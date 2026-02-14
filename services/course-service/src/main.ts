import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3100',  // Page Builder
      'http://localhost:3200',  // Storefront
      'http://localhost:3300',  // Admin Dashboard
    ],
    credentials: true,
  });

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NextGen CMS Course Service')
    .setDescription('API for managing courses, lessons, enrollments, progress, quizzes, and certificates')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('courses', 'Course management endpoints')
    .addTag('sections', 'Course section management')
    .addTag('lessons', 'Lesson management')
    .addTag('enrollments', 'Student enrollment management')
    .addTag('progress', 'Learning progress tracking')
    .addTag('quizzes', 'Quiz and assessment management')
    .addTag('certificates', 'Certificate generation and verification')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port);

  logger.log(`Course Service running on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api`);
}

bootstrap();
