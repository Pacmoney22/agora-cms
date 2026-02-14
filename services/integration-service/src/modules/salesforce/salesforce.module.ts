import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StubCRMConnector } from '../../common/stubs/stub-crm-connector';

export const CRM_CONNECTOR = 'CRM_CONNECTOR';

/**
 * SalesforceModule provides the ICRMConnector implementation.
 *
 * When SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET are set in the
 * environment, a real Salesforce connector will be used (not yet implemented).
 * Otherwise, the StubCRMConnector is injected for local development.
 */
@Module({
  providers: [
    {
      provide: CRM_CONNECTOR,
      useFactory: (configService: ConfigService) => {
        const clientId = configService.get<string>('SALESFORCE_CLIENT_ID');
        const clientSecret = configService.get<string>('SALESFORCE_CLIENT_SECRET');

        if (clientId && clientSecret) {
          // TODO: Return real Salesforce connector when implemented
          // return new SalesforceCRMConnector(clientId, clientSecret);
          return new StubCRMConnector();
        }

        return new StubCRMConnector();
      },
      inject: [ConfigService],
    },
  ],
  exports: [CRM_CONNECTOR],
})
export class SalesforceModule {}
