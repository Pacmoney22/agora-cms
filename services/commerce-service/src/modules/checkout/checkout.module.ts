import { Module } from '@nestjs/common';

import { CartModule } from '../cart/cart.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/order.module';

import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { TaxCalculationService } from './tax-calculation.service';


@Module({
  imports: [CartModule, OrdersModule, InventoryModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, TaxCalculationService],
  exports: [CheckoutService, TaxCalculationService],
})
export class CheckoutModule {}
