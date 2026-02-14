import { Module } from '@nestjs/common';
import { prisma } from '@agora-cms/database';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ProductsModule } from '../products/product.module';

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
