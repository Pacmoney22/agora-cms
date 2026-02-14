import { Module } from '@nestjs/common';
import { prisma } from '@agora-cms/database';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

@Module({
  controllers: [CategoryController],
  providers: [
    {
      provide: 'PRISMA',
      useFactory: () => prisma,
    },
    CategoryService,
  ],
  exports: [CategoryService],
})
export class CategoriesModule {}
