import { Module } from '@nestjs/common';

import { ProductsModule } from '../products/product.module';

import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [ProductsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
