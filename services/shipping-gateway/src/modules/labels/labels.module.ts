import { Module } from '@nestjs/common';
import { LabelsController } from './labels.controller';
import { RatesModule } from '../rates/rates.module';

@Module({
  imports: [RatesModule],
  controllers: [LabelsController],
})
export class LabelsModule {}
