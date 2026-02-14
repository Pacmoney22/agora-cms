import { Module } from '@nestjs/common';
import { prisma } from '@nextgen-cms/database';
import { ServiceBookingController } from './service-booking.controller';
import { ServiceBookingService } from './service-booking.service';
import { ProductsModule } from '../products/product.module';

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
