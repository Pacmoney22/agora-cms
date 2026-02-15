import { prisma } from '@agora-cms/database';
import { Module } from '@nestjs/common';

import { ProductsModule } from '../products/product.module';

import { OrderController } from './order.controller';
import { OrderService } from './order.service';


@Module({
  imports: [ProductsModule],
  controllers: [OrderController],
  providers: [
    {
      provide: 'PRISMA',
      useFactory: () => prisma,
    },
    OrderService,
  ],
  exports: [OrderService, 'PRISMA'],
})
export class OrdersModule {}
