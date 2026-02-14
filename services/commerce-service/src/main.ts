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
    .setTitle('Agora CMS Commerce Service')
    .setDescription(
      'API for products, variants, categories, cart, checkout, orders, fulfillment, inventory, coupons, license keys, and service bookings',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('products', 'Product management endpoints')
    .addTag('variants', 'Product variant management')
    .addTag('categories', 'Category management endpoints')
    .addTag('cart', 'Shopping cart endpoints')
    .addTag('checkout', 'Checkout orchestration')
    .addTag('orders', 'Order management endpoints')
    .addTag('fulfillment', 'Order fulfillment endpoints')
    .addTag('inventory', 'Inventory management endpoints')
    .addTag('coupons', 'Coupon and discount endpoints')
    .addTag('license-keys', 'License key management')
    .addTag('service-bookings', 'Service booking management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);

  logger.log(`Commerce Service running on http://localhost:${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
