import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';

@Module({
  controllers: [VenuesController],
  providers: [
    VenuesService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [VenuesService],
})
export class VenuesModule {}
