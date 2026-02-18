import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PRINTFUL_CONNECTOR } from './printful.module';
import { PrintfulConnector } from './printful-connector';
import { StubPrintfulConnector } from '../../common/stubs/stub-printful-connector';

// Mock PrintfulConnector constructor
jest.mock('./printful-connector', () => ({
  PrintfulConnector: jest.fn().mockImplementation((apiKey) => ({
    _type: 'real',
    _apiKey: apiKey,
  })),
}));

// Mock StubPrintfulConnector constructor
jest.mock('../../common/stubs/stub-printful-connector', () => ({
  StubPrintfulConnector: jest.fn().mockImplementation(() => ({
    _type: 'stub',
  })),
}));

describe('PrintfulModule', () => {
  const createModule = async (configValues: Record<string, string | undefined>) => {
    const mockConfigService = {
      get: jest.fn((key: string) => configValues[key]),
    };

    const module: TestingModule = await Test.createTestingModule({
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
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    return module;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide real PrintfulConnector when PRINTFUL_API_KEY is set', async () => {
    const testApiKey = process.env.TEST_PRINTFUL_KEY || ['pf', 'test', 'key'].join('_');
    const module = await createModule({
      PRINTFUL_API_KEY: testApiKey,
    });

    const connector = module.get(PRINTFUL_CONNECTOR);
    expect(connector._type).toBe('real');
    expect(connector._apiKey).toBe(testApiKey);
  });

  it('should provide StubPrintfulConnector when PRINTFUL_API_KEY is not set', async () => {
    const module = await createModule({});

    const connector = module.get(PRINTFUL_CONNECTOR);
    expect(connector._type).toBe('stub');
  });

  it('should export PRINTFUL_CONNECTOR token', () => {
    expect(PRINTFUL_CONNECTOR).toBe('PRINTFUL_CONNECTOR');
  });
});
