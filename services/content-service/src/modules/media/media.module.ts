import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [MediaService],
})
export class MediaModule {}
