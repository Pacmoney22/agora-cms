import { Module } from '@nestjs/common';

import { CertificatesModule } from '../certificates/certificates.module';

import { EnrollmentConsumerService } from './enrollment-consumer.service';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';

@Module({
  imports: [CertificatesModule],
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService, EnrollmentConsumerService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
