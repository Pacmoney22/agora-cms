import { Test, TestingModule } from '@nestjs/testing';

import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';

describe('CertificatesController', () => {
  let controller: CertificatesController;

  const mockCertificatesService = {
    findAll: jest.fn(),
    regenerateCertificate: jest.fn(),
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
      expect(mockCertificatesService.generateCertificate).toHaveBeenCalledWith('e1', undefined);
    });

    it('should pass template when provided', async () => {
      mockCertificatesService.generateCertificate.mockResolvedValue({ id: 'cert2' });
      const template = { primaryColor: '#ff0000' };

      const response = await controller.generateCertificate('e1', { template });

      expect(response).toEqual({ id: 'cert2' });
      expect(mockCertificatesService.generateCertificate).toHaveBeenCalledWith('e1', template);
    });
  });

  describe('regenerateCertificate', () => {
    it('should call certificatesService.regenerateCertificate', async () => {
      mockCertificatesService.regenerateCertificate.mockResolvedValue({ id: 'cert1' });

      const response = await controller.regenerateCertificate('c1');

      expect(response).toEqual({ id: 'cert1' });
      expect(mockCertificatesService.regenerateCertificate).toHaveBeenCalledWith('c1', undefined);
    });

    it('should pass template when provided', async () => {
      mockCertificatesService.regenerateCertificate.mockResolvedValue({ id: 'cert1' });
      const template = { titleText: 'Custom Title' };

      const response = await controller.regenerateCertificate('c1', { template });

      expect(response).toEqual({ id: 'cert1' });
      expect(mockCertificatesService.regenerateCertificate).toHaveBeenCalledWith('c1', template);
    });
  });

  describe('findAll', () => {
    it('should call certificatesService.findAll with query params', async () => {
      mockCertificatesService.findAll.mockResolvedValue({ data: [], meta: { total: 0 } });

      const response = await controller.findAll('course-1', undefined, 1, 20);

      expect(response).toEqual({ data: [], meta: { total: 0 } });
      expect(mockCertificatesService.findAll).toHaveBeenCalledWith({
        courseId: 'course-1',
        userId: undefined,
        page: 1,
        limit: 20,
      });
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
