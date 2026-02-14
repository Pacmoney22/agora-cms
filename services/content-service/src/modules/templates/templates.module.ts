import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({
  controllers: [TemplatesController],
  providers: [
    TemplatesService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [TemplatesService],
})
export class TemplatesModule {}
