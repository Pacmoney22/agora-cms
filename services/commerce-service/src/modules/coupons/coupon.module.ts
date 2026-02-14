import { Module } from '@nestjs/common';
import { prisma } from '@nextgen-cms/database';
import { CouponController } from './coupon.controller';
import { CouponService } from './coupon.service';

@Module({
  controllers: [CouponController],
  providers: [
    {
      provide: 'PRISMA',
      useFactory: () => prisma,
    },
    CouponService,
  ],
  exports: [CouponService],
})
export class CouponsModule {}
