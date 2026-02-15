import { prisma } from '@agora-cms/database';
import { Module } from '@nestjs/common';

import { ProductsModule } from '../products/product.module';

import { ServiceBookingController } from './service-booking.controller';
import { ServiceBookingService } from './service-booking.service';


@Module({
  imports: [ProductsModule],
  controllers: [ServiceBookingController],
  providers: [
    {
      provide: 'PRISMA',
      useFactory: () => prisma,
    },
    ServiceBookingService,
  ],
  exports: [ServiceBookingService],
})
export class ServiceBookingsModule {}
