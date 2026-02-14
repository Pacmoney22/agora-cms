import { Module } from '@nestjs/common';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CertificateGeneratorService } from './certificate-generator.service';

@Module({
  controllers: [CertificatesController],
  providers: [CertificatesService, CertificateGeneratorService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
