import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RedirectsController } from './redirects.controller';
import { RedirectsService } from './redirects.service';

@Module({
  controllers: [RedirectsController],
  providers: [
    RedirectsService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [RedirectsService],
})
export class RedirectsModule {}
