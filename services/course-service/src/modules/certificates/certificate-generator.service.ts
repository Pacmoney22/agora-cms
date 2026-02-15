import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

@Injectable()
export class CertificateGeneratorService {
  private readonly logger = new Logger(CertificateGeneratorService.name);
  private readonly s3Client: S3Client;

  constructor(private readonly config: ConfigService) {
    // MinIO default credentials for local development only
    // IMPORTANT: These are public MinIO defaults - do NOT use in production
    const MINIO_DEFAULT_USER = 'minioadmin';
    const MINIO_DEFAULT_PASSWORD = 'minioadmin';

    this.s3Client = new S3Client({
      region: this.config.get<string>('AWS_REGION') || 'us-east-1',
      endpoint: this.config.get<string>('S3_ENDPOINT') || 'http://localhost:9000',
      credentials: {
        accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID') || MINIO_DEFAULT_USER,
        secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY') || MINIO_DEFAULT_PASSWORD,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  async generate(data: {
    enrollmentId: string;
    studentName: string;
    courseTitle: string;
    completedAt: Date;
    instructorName?: string;
  }): Promise<{ certificateUrl: string; verificationCode: string; pdfBuffer: Buffer }> {
    const verificationCode = this.generateVerificationCode();

    // Generate PDF
    const pdfBuffer = await this.createCertificatePDF({
      studentName: data.studentName,
      courseTitle: data.courseTitle,
      completedAt: data.completedAt,
      verificationCode,
      instructorName: data.instructorName,
    });

    // Upload to S3
    const s3Key = `certificates/${data.enrollmentId}.pdf`;
    const bucket = this.config.get<string>('S3_BUCKET') || 'agora-cms';

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: s3Key,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
          ContentDisposition: `inline; filename="certificate-${data.enrollmentId}.pdf"`,
        })
      );

      const s3Endpoint = this.config.get<string>('S3_ENDPOINT') || 'http://localhost:9000';
      const certificateUrl = `${s3Endpoint}/${bucket}/${s3Key}`;

      this.logger.log(`Certificate generated and uploaded: ${certificateUrl}`);

      return {
        certificateUrl,
        verificationCode,
        pdfBuffer,
      };
    } catch (error) {
      this.logger.error('Failed to upload certificate to S3', error);
      throw error;
    }
  }

  private async createCertificatePDF(data: {
    studentName: string;
    courseTitle: string;
    completedAt: Date;
    verificationCode: string;
    instructorName?: string;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Certificate design
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const centerX = pageWidth / 2;

      // Border
      doc
        .lineWidth(5)
        .strokeColor('#1e40af')
        .rect(30, 30, pageWidth - 60, pageHeight - 60)
        .stroke();

      doc
        .lineWidth(2)
        .strokeColor('#3b82f6')
        .rect(40, 40, pageWidth - 80, pageHeight - 80)
        .stroke();

      // Title
      doc
        .fontSize(54)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text('Certificate of Completion', 60, 120, {
          align: 'center',
          width: pageWidth - 120,
        });

      // Subtitle
      doc
        .fontSize(16)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text('This is to certify that', 60, 200, {
          align: 'center',
          width: pageWidth - 120,
        });

      // Student name
      doc
        .fontSize(36)
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .text(data.studentName, 60, 240, {
          align: 'center',
          width: pageWidth - 120,
        });

      // Completion text
      doc
        .fontSize(16)
        .font('Helvetica')
        .fillColor('#4b5563')
        .text('has successfully completed', 60, 310, {
          align: 'center',
          width: pageWidth - 120,
        });

      // Course title
      doc
        .fontSize(28)
        .font('Helvetica-Bold')
        .fillColor('#1e40af')
        .text(data.courseTitle, 60, 345, {
          align: 'center',
          width: pageWidth - 120,
        });

      // Date
      const formattedDate = data.completedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#6b7280')
        .text(`Completed on ${formattedDate}`, 60, 420, {
          align: 'center',
          width: pageWidth - 120,
        });

      // Instructor signature line (if provided)
      if (data.instructorName) {
        const signatureY = pageHeight - 150;

        doc
          .moveTo(centerX - 150, signatureY)
          .lineTo(centerX + 150, signatureY)
          .strokeColor('#9ca3af')
          .lineWidth(1)
          .stroke();

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#374151')
          .text(data.instructorName, centerX - 150, signatureY + 10, {
            width: 300,
            align: 'center',
          });

        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text('Instructor', centerX - 150, signatureY + 30, {
            width: 300,
            align: 'center',
          });
      }

      // Verification code at bottom
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#9ca3af')
        .text(`Verification Code: ${data.verificationCode}`, 60, pageHeight - 60, {
          align: 'center',
          width: pageWidth - 120,
        });

      // Finalize PDF
      doc.end();
    });
  }

  private generateVerificationCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 11).toUpperCase();
    return `CERT-${timestamp}-${random}`;
  }

  async verifyCode(code: string): Promise<boolean> {
    // Verification code format: CERT-{timestamp}-{random}
    // This is a simple check - in production, you'd verify against the database
    const pattern = /^CERT-[A-Z0-9]{7,12}-[A-Z0-9]{9}$/;
    return pattern.test(code);
  }
}
