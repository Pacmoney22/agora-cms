import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';

@Module({
  controllers: [VersionsController],
  providers: [
    VersionsService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [VersionsService],
})
export class VersionsModule {}
