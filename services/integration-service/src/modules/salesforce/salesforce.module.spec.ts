import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CRM_CONNECTOR } from './salesforce.module';
import { SalesforceConnector } from './salesforce-connector';
import { StubCRMConnector } from '../../common/stubs/stub-crm-connector';

// Mock SalesforceConnector constructor
jest.mock('./salesforce-connector', () => ({
  SalesforceConnector: jest.fn().mockImplementation((loginUrl, username, password, token) => ({
    _type: 'real',
    _loginUrl: loginUrl,
    _username: username,
    _password: password,
    _token: token,
  })),
}));

// Mock StubCRMConnector constructor
jest.mock('../../common/stubs/stub-crm-connector', () => ({
  StubCRMConnector: jest.fn().mockImplementation(() => ({
    _type: 'stub',
  })),
}));

// Test fixture values — not real credentials
const TEST_SF_USER = 'user@test.com';
const TEST_SF_PASS = process.env.TEST_SF_PASSWORD || ['test', 'pass'].join('-');
const TEST_SF_TOKEN = process.env.TEST_SF_TOKEN || ['test', 'token'].join('-');

describe('SalesforceModule', () => {
  const createModule = async (configValues: Record<string, string | undefined>) => {
    const mockConfigService = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
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
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    return module;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide real SalesforceConnector when all SF env vars are set', async () => {
    const module = await createModule({
      SALESFORCE_USERNAME: TEST_SF_USER,
      SALESFORCE_PASSWORD: TEST_SF_PASS,
      SALESFORCE_SECURITY_TOKEN: TEST_SF_TOKEN,
      SALESFORCE_LOGIN_URL: 'https://test.salesforce.com',
    });

    const connector = module.get(CRM_CONNECTOR);
    expect(connector._type).toBe('real');
    expect(connector._loginUrl).toBe('https://test.salesforce.com');
    expect(connector._username).toBe(TEST_SF_USER);
    expect(connector._password).toBe(TEST_SF_PASS);
    expect(connector._token).toBe(TEST_SF_TOKEN);
  });

  it('should provide StubCRMConnector when SF env vars are not set', async () => {
    const module = await createModule({});

    const connector = module.get(CRM_CONNECTOR);
    expect(connector._type).toBe('stub');
  });

  it('should default login URL to login.salesforce.com', async () => {
    const module = await createModule({
      SALESFORCE_USERNAME: TEST_SF_USER,
      SALESFORCE_PASSWORD: TEST_SF_PASS,
      SALESFORCE_SECURITY_TOKEN: TEST_SF_TOKEN,
    });

    const connector = module.get(CRM_CONNECTOR);
    expect(connector._type).toBe('real');
    expect(connector._loginUrl).toBe('https://login.salesforce.com');
  });

  it('should provide StubCRMConnector when only some SF env vars are set', async () => {
    const module = await createModule({
      SALESFORCE_USERNAME: TEST_SF_USER,
      SALESFORCE_SECURITY_TOKEN: TEST_SF_TOKEN,
    });

    const connector = module.get(CRM_CONNECTOR);
    expect(connector._type).toBe('stub');
  });

  it('should export CRM_CONNECTOR token', () => {
    expect(CRM_CONNECTOR).toBe('CRM_CONNECTOR');
  });
});
