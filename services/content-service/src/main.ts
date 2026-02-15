import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
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
    .setTitle('Agora CMS Content Service')
    .setDescription('API for managing pages, media, templates, navigation, and SEO')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('pages', 'Page management endpoints')
    .addTag('media', 'Media upload and management')
    .addTag('templates', 'Template management')
    .addTag('versions', 'Version history')
    .addTag('navigation', 'Navigation menu management')
    .addTag('redirects', 'URL redirect management')
    .addTag('seo', 'SEO configuration')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`Content Service running on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
