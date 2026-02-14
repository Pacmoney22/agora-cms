import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PageController } from './page.controller';
import { PageService } from './page.service';

@Module({
  controllers: [PageController],
  providers: [
    PageService,
    {
      provide: 'PRISMA',
      useFactory: () => {
        const prisma = new PrismaClient();
        return prisma;
      },
    },
  ],
  exports: [PageService, 'PRISMA'],
})
export class PagesModule {}
