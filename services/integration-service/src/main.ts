import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('IntegrationService');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Agora CMS Integration Service')
    .setDescription('Payment, Analytics & CRM integration APIs')
    .setVersion('1.0')
    .addTag('stripe', 'Payment processing via Stripe')
    .addTag('analytics', 'Analytics tracking and dashboards')
    .addTag('salesforce', 'CRM synchronization')
    .addTag('webhooks', 'Inbound webhook handlers')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(`Integration Service running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
