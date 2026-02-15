import { prisma } from '@agora-cms/database';
import { Module } from '@nestjs/common';

import { VariantController } from './variant.controller';
import { VariantService } from './variant.service';

@Module({
  controllers: [VariantController],
  providers: [
    {
      provide: 'PRISMA',
      useFactory: () => prisma,
    },
    VariantService,
  ],
  exports: [VariantService],
})
export class VariantsModule {}
