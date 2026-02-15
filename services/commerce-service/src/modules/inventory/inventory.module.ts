import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import Redis from 'ioredis';

import { ProductsModule } from '../products/product.module';

import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { ReservationService } from './reservation.service';

@Module({
  imports: [ProductsModule, ScheduleModule.forRoot()],
  controllers: [InventoryController],
  providers: [
    {
      provide: 'REDIS',
      useFactory: () => {
        return new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      },
    },
    InventoryService,
    ReservationService,
  ],
  exports: [InventoryService, ReservationService],
})
export class InventoryModule {}
