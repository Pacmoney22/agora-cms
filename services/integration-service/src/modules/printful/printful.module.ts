import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StubPrintfulConnector } from '../../common/stubs/stub-printful-connector';
import { PrintfulConnector } from './printful-connector';

export const PRINTFUL_CONNECTOR = 'PRINTFUL_CONNECTOR';

/**
 * PrintfulModule provides the IPrintfulConnector implementation.
 *
 * When PRINTFUL_API_KEY is set in the environment, the real Printful connector
 * is used. Otherwise, the StubPrintfulConnector is injected for local development.
 */
@Module({
  providers: [
    {
      provide: PRINTFUL_CONNECTOR,
      useFactory: (configService: ConfigService) => {
        const printfulApiKey = configService.get<string>('PRINTFUL_API_KEY');

        if (printfulApiKey) {
          return new PrintfulConnector(printfulApiKey);
        }

        return new StubPrintfulConnector();
      },
      inject: [ConfigService],
    },
  ],
  exports: [PRINTFUL_CONNECTOR],
})
export class PrintfulModule {}
