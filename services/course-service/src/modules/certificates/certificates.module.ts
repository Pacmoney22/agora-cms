import { Module } from '@nestjs/common';

import { CertificateGeneratorService } from './certificate-generator.service';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificateGeneratorService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
