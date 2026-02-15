import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StubCRMConnector } from '../../common/stubs/stub-crm-connector';
import { SalesforceConnector } from './salesforce-connector';

export const CRM_CONNECTOR = 'CRM_CONNECTOR';

/**
 * SalesforceModule provides the ICRMConnector implementation.
 *
 * When SALESFORCE_USERNAME, SALESFORCE_PASSWORD, and SALESFORCE_SECURITY_TOKEN
 * are set, the real Salesforce connector is used. Otherwise, the
 * StubCRMConnector is injected for local development.
 *
 * Optionally set SALESFORCE_LOGIN_URL (defaults to https://login.salesforce.com).
 * For sandboxes, use https://test.salesforce.com.
 */
@Module({
  providers: [
    {
      provide: CRM_CONNECTOR,
      useFactory: (configService: ConfigService) => {
        const username = configService.get<string>('SALESFORCE_USERNAME');
        const password = configService.get<string>('SALESFORCE_PASSWORD');
        const securityToken = configService.get<string>('SALESFORCE_SECURITY_TOKEN');
        const loginUrl = configService.get<string>('SALESFORCE_LOGIN_URL') || 'https://login.salesforce.com';

        if (username && password && securityToken) {
          return new SalesforceConnector(loginUrl, username, password, securityToken);
        }

        return new StubCRMConnector();
      },
      inject: [ConfigService],
    },
  ],
  exports: [CRM_CONNECTOR],
})
export class SalesforceModule {}
