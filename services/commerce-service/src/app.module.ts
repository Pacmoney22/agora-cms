import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CartModule } from './modules/cart/cart.module';
import { CategoriesModule } from './modules/categories/category.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { CouponsModule } from './modules/coupons/coupon.module';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LicenseKeysModule } from './modules/license-keys/license-key.module';
import { OrdersModule } from './modules/orders/order.module';
import { ProductsModule } from './modules/products/product.module';
import { ServiceBookingsModule } from './modules/service-bookings/service-booking.module';
import { VariantsModule } from './modules/variants/variant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ProductsModule,
    VariantsModule,
    CategoriesModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    FulfillmentModule,
    InventoryModule,
    CouponsModule,
    LicenseKeysModule,
    ServiceBookingsModule,
  ],
})
export class AppModule {}
