import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { PassesController } from './passes.controller';
import { PassesService } from './passes.service';

@Module({
  controllers: [PassesController],
  providers: [
    PassesService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [PassesService],
})
export class PassesModule {}
