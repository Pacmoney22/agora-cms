import { Module } from '@nestjs/common';
import { prisma } from '@agora-cms/database';
import { LicenseKeyController } from './license-key.controller';
import { LicenseKeyService } from './license-key.service';

@Module({
  controllers: [LicenseKeyController],
  providers: [
    {
      provide: 'PRISMA',
      useFactory: () => prisma,
    },
    LicenseKeyService,
  ],
  exports: [LicenseKeyService],
})
export class LicenseKeysModule {}
