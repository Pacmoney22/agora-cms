import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CertificateGeneratorService } from './certificate-generator.service';

// Mock pdfkit
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};

    const mockDoc = {
      page: { width: 842, height: 595 },
      on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!handlers[event]) handlers[event] = [];
        handlers[event].push(handler);
        return mockDoc;
      }),
      lineWidth: jest.fn().mockReturnThis(),
      strokeColor: jest.fn().mockReturnThis(),
      rect: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      end: jest.fn(() => {
        // Simulate PDF generation: emit data then end
        const dataHandlers = handlers['data'] || [];
        const endHandlers = handlers['end'] || [];
        const chunk = Buffer.from('mock-pdf-content');
        dataHandlers.forEach((h) => h(chunk));
        endHandlers.forEach((h) => h());
      }),
    };
    return mockDoc;
  });
});

// Mock S3Client
const mockS3Send = jest.fn();
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockS3Send,
    })),
    PutObjectCommand: jest.fn().mockImplementation((params) => params),
  };
});

describe('CertificateGeneratorService', () => {
  let service: CertificateGeneratorService;
  let configService: ConfigService;

  const mockConfig = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        AWS_REGION: 'us-east-1',
        S3_ENDPOINT: 'http://localhost:9000',
        AWS_ACCESS_KEY_ID: 'testkey',
        AWS_SECRET_ACCESS_KEY: 'testsecret',
        S3_BUCKET: 'test-bucket',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateGeneratorService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<CertificateGeneratorService>(CertificateGeneratorService);
    jest.clearAllMocks();
    // Re-setup config mock after clearAllMocks
    mockConfig.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        AWS_REGION: 'us-east-1',
        S3_ENDPOINT: 'http://localhost:9000',
        AWS_ACCESS_KEY_ID: 'testkey',
        AWS_SECRET_ACCESS_KEY: 'testsecret',
        S3_BUCKET: 'test-bucket',
      };
      return config[key];
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── generate ──────────────────────────────────────────────────────

  describe('generate', () => {
    const generateData = {
      enrollmentId: 'e1',
      studentName: 'Jane Student',
      courseTitle: 'TypeScript Mastery',
      completedAt: new Date('2025-01-15'),
      instructorName: 'John Doe',
    };

    it('should generate a certificate PDF, upload to S3, and return URL', async () => {
      mockS3Send.mockResolvedValue({});

      const result = await service.generate(generateData);

      expect(result).toEqual({
        certificateUrl: expect.stringContaining('certificates/e1.pdf'),
        verificationCode: expect.stringMatching(/^CERT-/),
        pdfBuffer: expect.any(Buffer),
      });
      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: 'certificates/e1.pdf',
          ContentType: 'application/pdf',
        }),
      );
    });

    it('should generate a certificate without instructor name', async () => {
      mockS3Send.mockResolvedValue({});

      const result = await service.generate({
        ...generateData,
        instructorName: undefined,
      });

      expect(result.certificateUrl).toBeDefined();
      expect(result.verificationCode).toMatch(/^CERT-/);
    });

    it('should throw when S3 upload fails', async () => {
      mockS3Send.mockRejectedValue(new Error('S3 connection refused'));

      await expect(service.generate(generateData)).rejects.toThrow('S3 connection refused');
    });
  });

  // ─── verifyCode ────────────────────────────────────────────────────

  describe('verifyCode', () => {
    it('should return true for valid verification code format', async () => {
      const result = await service.verifyCode('CERT-ABCDE12-ABCDE1234');

      expect(result).toBe(true);
    });

    it('should return false for invalid verification code format', async () => {
      expect(await service.verifyCode('INVALID-CODE')).toBe(false);
      expect(await service.verifyCode('CERT-')).toBe(false);
      expect(await service.verifyCode('')).toBe(false);
      expect(await service.verifyCode('cert-abc-123456789')).toBe(false); // lowercase
    });
  });
});
