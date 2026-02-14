import { Module } from '@nestjs/common';
import { BinPackingService } from './bin-packing.service';

@Module({
  providers: [BinPackingService],
  exports: [BinPackingService],
})
export class BinPackingModule {}
