import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [
    SettingsService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
