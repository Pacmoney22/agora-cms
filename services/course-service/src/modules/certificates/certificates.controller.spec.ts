import { Test, TestingModule } from '@nestjs/testing';

import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

describe('CertificatesController', () => {
  let controller: CertificatesController;

  const mockCertificatesService = {
    generateCertificate: jest.fn(),
    getCertificateByEnrollmentId: jest.fn(),
    verifyCertificate: jest.fn(),
    getCertificatesByUserId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CertificatesController],
      providers: [
        { provide: CertificatesService, useValue: mockCertificatesService },
      ],
    }).compile();

    controller = module.get<CertificatesController>(CertificatesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateCertificate', () => {
    it('should call certificatesService.generateCertificate', async () => {
      mockCertificatesService.generateCertificate.mockResolvedValue({ id: 'cert1' });

      const response = await controller.generateCertificate('e1');

      expect(response).toEqual({ id: 'cert1' });
      expect(mockCertificatesService.generateCertificate).toHaveBeenCalledWith('e1');
    });
  });

  describe('getCertificateByEnrollmentId', () => {
    it('should call certificatesService.getCertificateByEnrollmentId', async () => {
      mockCertificatesService.getCertificateByEnrollmentId.mockResolvedValue({ id: 'cert1' });

      const response = await controller.getCertificateByEnrollmentId('e1');

      expect(response).toEqual({ id: 'cert1' });
    });
  });

  describe('verifyCertificate', () => {
    it('should call certificatesService.verifyCertificate', async () => {
      mockCertificatesService.verifyCertificate.mockResolvedValue({ valid: true });

      const response = await controller.verifyCertificate('CERT-ABC-123');

      expect(response).toEqual({ valid: true });
    });
  });

  describe('getCertificatesByUserId', () => {
    it('should call certificatesService.getCertificatesByUserId', async () => {
      mockCertificatesService.getCertificatesByUserId.mockResolvedValue([{ id: 'cert1' }]);

      const response = await controller.getCertificatesByUserId('u1');

      expect(response).toEqual([{ id: 'cert1' }]);
    });
  });
});
