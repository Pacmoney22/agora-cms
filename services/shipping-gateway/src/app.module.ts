import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RatesModule } from './modules/rates/rates.module';
import { LabelsModule } from './modules/labels/labels.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { BinPackingModule } from './modules/bin-packing/bin-packing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
    }),
    ScheduleModule.forRoot(),
    RatesModule,
    LabelsModule,
    TrackingModule,
    BinPackingModule,
  ],
})
export class AppModule {}
