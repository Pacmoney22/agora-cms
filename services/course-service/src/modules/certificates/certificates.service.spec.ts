import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { CertificateGeneratorService } from './certificate-generator.service';
import { CertificatesService } from './certificates.service';

describe('CertificatesService', () => {
  let service: CertificatesService;

  const mockPrisma = {
    courseEnrollment: {
      findUnique: jest.fn(),
    },
    certificate: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockCertificateGenerator = {
    generate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificatesService,
        { provide: 'PRISMA', useValue: mockPrisma },
        { provide: CertificateGeneratorService, useValue: mockCertificateGenerator },
      ],
    }).compile();

    service = module.get<CertificatesService>(CertificatesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── generateCertificate ───────────────────────────────────────────

  describe('generateCertificate', () => {
    const mockEnrollment = {
      id: 'e1',
      status: 'completed',
      completedAt: new Date('2025-01-15'),
      course: {
        title: 'TypeScript Mastery',
        author: { id: 'u1', name: 'John Doe' },
      },
      user: {
        id: 'u2',
        name: 'Jane Student',
        email: 'jane@test.com',
      },
    };

    it('should generate a certificate for a completed enrollment', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment);
      mockPrisma.certificate.findFirst.mockResolvedValue(null); // no existing cert
      mockCertificateGenerator.generate.mockResolvedValue({
        certificateUrl: 'http://s3/certificates/e1.pdf',
        verificationCode: 'CERT-ABC-123456789',
      });
      const created = {
        id: 'cert1',
        enrollmentId: 'e1',
        verificationCode: 'CERT-ABC-123456789',
        certificateUrl: 'http://s3/certificates/e1.pdf',
      };
      mockPrisma.certificate.create.mockResolvedValue(created);

      const result = await service.generateCertificate('e1');

      expect(result).toEqual(created);
      expect(mockCertificateGenerator.generate).toHaveBeenCalledWith({
        enrollmentId: 'e1',
        studentName: 'Jane Student',
        courseTitle: 'TypeScript Mastery',
        completedAt: expect.any(Date),
        instructorName: 'John Doe',
      });
    });

    it('should return existing certificate if already generated', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(mockEnrollment);
      const existingCert = { id: 'cert1', enrollmentId: 'e1' };
      mockPrisma.certificate.findFirst.mockResolvedValue(existingCert);

      const result = await service.generateCertificate('e1');

      expect(result).toEqual(existingCert);
      expect(mockCertificateGenerator.generate).not.toHaveBeenCalled();
      expect(mockPrisma.certificate.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if enrollment does not exist', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(null);

      await expect(
        service.generateCertificate('nonexistent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.generateCertificate('nonexistent'),
      ).rejects.toThrow('Enrollment with id "nonexistent" not found');
    });

    it('should throw BadRequestException if enrollment is not completed', async () => {
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue({
        ...mockEnrollment,
        status: 'active',
      });

      await expect(
        service.generateCertificate('e1'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.generateCertificate('e1'),
      ).rejects.toThrow('Certificate can only be generated for completed enrollments');
    });

    it('should use "Unknown" when no author/instructor is set', async () => {
      const enrollmentNoAuthor = {
        ...mockEnrollment,
        course: {
          ...mockEnrollment.course,
          author: null,
        },
      };
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(enrollmentNoAuthor);
      mockPrisma.certificate.findFirst.mockResolvedValue(null);
      mockCertificateGenerator.generate.mockResolvedValue({
        certificateUrl: 'http://s3/cert.pdf',
        verificationCode: 'CERT-XYZ-123',
      });
      mockPrisma.certificate.create.mockResolvedValue({ id: 'cert1' });

      await service.generateCertificate('e1');

      expect(mockCertificateGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          instructorName: 'Unknown',
        }),
      );
    });

    it('should use current date when completedAt is null', async () => {
      const enrollmentNoDate = {
        ...mockEnrollment,
        completedAt: null,
      };
      mockPrisma.courseEnrollment.findUnique.mockResolvedValue(enrollmentNoDate);
      mockPrisma.certificate.findFirst.mockResolvedValue(null);
      mockCertificateGenerator.generate.mockResolvedValue({
        certificateUrl: 'http://s3/cert.pdf',
        verificationCode: 'CERT-XYZ-123',
      });
      mockPrisma.certificate.create.mockResolvedValue({ id: 'cert1' });

      await service.generateCertificate('e1');

      expect(mockCertificateGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          completedAt: expect.any(Date),
        }),
      );
    });
  });

  // ─── getCertificateByEnrollmentId ──────────────────────────────────

  describe('getCertificateByEnrollmentId', () => {
    it('should return certificate with enrollment and course', async () => {
      const cert = {
        id: 'cert1',
        enrollmentId: 'e1',
        enrollment: { course: { id: 'c1', title: 'Course 1' } },
      };
      mockPrisma.certificate.findFirst.mockResolvedValue(cert);

      const result = await service.getCertificateByEnrollmentId('e1');

      expect(result).toEqual(cert);
      expect(mockPrisma.certificate.findFirst).toHaveBeenCalledWith({
        where: { enrollmentId: 'e1' },
        include: {
          enrollment: { include: { course: true } },
        },
      });
    });

    it('should throw NotFoundException if certificate does not exist', async () => {
      mockPrisma.certificate.findFirst.mockResolvedValue(null);

      await expect(
        service.getCertificateByEnrollmentId('nonexistent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getCertificateByEnrollmentId('nonexistent'),
      ).rejects.toThrow('Certificate not found for enrollment "nonexistent"');
    });
  });

  // ─── verifyCertificate ─────────────────────────────────────────────

  describe('verifyCertificate', () => {
    it('should verify a valid certificate', async () => {
      const cert = {
        id: 'cert1',
        issuedAt: new Date('2025-01-20'),
        enrollment: {
          userId: 'u2',
          completedAt: new Date('2025-01-15'),
          course: {
            id: 'c1',
            title: 'TypeScript Mastery',
            description: 'Learn TS',
          },
        },
      };
      mockPrisma.certificate.findUnique.mockResolvedValue(cert);

      const result = await service.verifyCertificate('CERT-ABC-123');

      expect(result).toEqual({
        valid: true,
        certificateId: 'cert1',
        userId: 'u2',
        courseTitle: 'TypeScript Mastery',
        issuedAt: expect.any(Date),
        completedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException for invalid verification code', async () => {
      mockPrisma.certificate.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyCertificate('INVALID-CODE'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.verifyCertificate('INVALID-CODE'),
      ).rejects.toThrow('Certificate with verification code "INVALID-CODE" not found');
    });
  });

  // ─── getCertificatesByUserId ───────────────────────────────────────

  describe('getCertificatesByUserId', () => {
    it('should return all certificates for a user', async () => {
      const certs = [
        {
          id: 'cert1',
          enrollment: { course: { id: 'c1', title: 'Course 1' } },
        },
        {
          id: 'cert2',
          enrollment: { course: { id: 'c2', title: 'Course 2' } },
        },
      ];
      mockPrisma.certificate.findMany.mockResolvedValue(certs);

      const result = await service.getCertificatesByUserId('u1');

      expect(result).toEqual(certs);
      expect(mockPrisma.certificate.findMany).toHaveBeenCalledWith({
        where: { enrollment: { userId: 'u1' } },
        include: expect.objectContaining({
          enrollment: expect.any(Object),
        }),
        orderBy: { issuedAt: 'desc' },
      });
    });

    it('should return empty array when user has no certificates', async () => {
      mockPrisma.certificate.findMany.mockResolvedValue([]);

      const result = await service.getCertificatesByUserId('u1');

      expect(result).toEqual([]);
    });
  });
});
