import { Module } from '@nestjs/common';
import { prisma } from '@nextgen-cms/database';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  controllers: [ProductController],
  providers: [
    {
      provide: 'PRISMA',
      useFactory: () => prisma,
    },
    ProductService,
  ],
  exports: [ProductService, 'PRISMA'],
})
export class ProductsModule {}
