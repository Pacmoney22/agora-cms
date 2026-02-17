import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  controllers: [ArticlesController],
  providers: [
    ArticlesService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [ArticlesService],
})
export class ArticlesModule {}
