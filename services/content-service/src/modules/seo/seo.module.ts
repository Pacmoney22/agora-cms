import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';
import { SeoAnalyzerService } from './seo-analyzer.service';
import { StructuredDataService } from './structured-data.service';

@Module({
  controllers: [SeoController],
  providers: [
    SeoService,
    SeoAnalyzerService,
    StructuredDataService,
    {
      provide: 'PRISMA',
      useFactory: () => new PrismaClient(),
    },
  ],
  exports: [SeoService, SeoAnalyzerService, StructuredDataService],
})
export class SeoModule {}
