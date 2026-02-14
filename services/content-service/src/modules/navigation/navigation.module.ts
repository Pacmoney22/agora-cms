import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';

@Module({
  controllers: [NavigationController],
  providers: [
    NavigationService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [NavigationService],
})
export class NavigationModule {}
