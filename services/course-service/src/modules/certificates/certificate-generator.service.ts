import { Readable } from 'stream';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';


@Injectable()
export class CertificateGeneratorService {
  private readonly logger = new Logger(CertificateGeneratorService.name);
  private readonly s3Client: S3Client;

  constructor(private readonly config: ConfigService) {
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID')
      || this.config.get<string>('S3_ACCESS_KEY') || '';
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY')
      || this.config.get<string>('S3_SECRET_KEY') || '';

    this.s3Client = new S3Client({
      region: this.config.get<string>('AWS_REGION') || 'us-east-1',
      endpoint: this.config.get<string>('S3_ENDPOINT') || 'http://localhost:9000',
      credentials: {
        accessKeyId,
        secretAccessKey,
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
    template?: Record<string, any>;
  }): Promise<{ certificateUrl: string; verificationCode: string; pdfBuffer: Buffer }> {
    const verificationCode = this.generateVerificationCode();

    // Generate PDF
    const pdfBuffer = await this.createCertificatePDF({
      studentName: data.studentName,
      courseTitle: data.courseTitle,
      completedAt: data.completedAt,
      verificationCode,
      instructorName: data.instructorName,
      template: data.template,
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
    template?: Record<string, any>;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const t = data.template || {};

      // Template values with fallbacks to original hardcoded design
      const primaryColor = t.primaryColor || '#1e40af';
      const borderColor = t.borderColor || '#3b82f6';
      const textColor = t.textColor || '#111827';
      const accentColor = t.accentColor || '#4b5563';
      const titleText = t.titleText || 'Certificate of Completion';
      const subtitleText = t.subtitleText || 'This is to certify that';
      const completionText = t.completionText || 'has successfully completed';
      const nameFontSize = t.nameFontSize || 36;
      const courseTitleFontSize = t.courseTitleFontSize || 28;
      const showBorder = t.showBorder !== undefined ? t.showBorder : true;
      const showDate = t.showDate !== undefined ? t.showDate : true;
      const showInstructor = t.showInstructor !== undefined ? t.showInstructor : true;
      const showVerificationCode = t.showVerificationCode !== undefined ? t.showVerificationCode : true;
      const borderStyle = t.borderStyle || 'double';
      const borderWidth = t.borderWidth || 5;
      const orientation = t.orientation || 'landscape';
      const organizationName = t.organizationName || '';
      const customFooterText = t.customFooterText || '';

      const doc = new PDFDocument({
        size: 'A4',
        layout: orientation,
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const centerX = pageWidth / 2;

      // Border
      if (showBorder && borderStyle !== 'none') {
        doc
          .lineWidth(borderWidth)
          .strokeColor(primaryColor)
          .rect(30, 30, pageWidth - 60, pageHeight - 60)
          .stroke();

        if (borderStyle === 'double') {
          doc
            .lineWidth(Math.max(1, borderWidth * 0.4))
            .strokeColor(borderColor)
            .rect(40, 40, pageWidth - 80, pageHeight - 80)
            .stroke();
        }
      }

      let yPos = 100;

      // Organization name
      if (organizationName) {
        doc
          .fontSize(12)
          .font('Helvetica')
          .fillColor(accentColor)
          .text(organizationName.toUpperCase(), 60, yPos, {
            align: 'center',
            width: pageWidth - 120,
            characterSpacing: 2,
          });
        yPos += 30;
      }

      // Title
      doc
        .fontSize(54)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(titleText, 60, yPos, {
          align: 'center',
          width: pageWidth - 120,
        });
      yPos += 80;

      // Subtitle
      doc
        .fontSize(16)
        .font('Helvetica')
        .fillColor(accentColor)
        .text(subtitleText, 60, yPos, {
          align: 'center',
          width: pageWidth - 120,
        });
      yPos += 30;

      // Student name
      doc
        .fontSize(nameFontSize)
        .font('Helvetica-Bold')
        .fillColor(textColor)
        .text(data.studentName, 60, yPos, {
          align: 'center',
          width: pageWidth - 120,
        });
      yPos += nameFontSize + 25;

      // Completion text
      doc
        .fontSize(16)
        .font('Helvetica')
        .fillColor(accentColor)
        .text(completionText, 60, yPos, {
          align: 'center',
          width: pageWidth - 120,
        });
      yPos += 30;

      // Course title
      doc
        .fontSize(courseTitleFontSize)
        .font('Helvetica-Bold')
        .fillColor(primaryColor)
        .text(data.courseTitle, 60, yPos, {
          align: 'center',
          width: pageWidth - 120,
        });
      yPos += courseTitleFontSize + 25;

      // Date
      if (showDate) {
        const formattedDate = data.completedAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        doc
          .fontSize(14)
          .font('Helvetica')
          .fillColor('#6b7280')
          .text(`Completed on ${formattedDate}`, 60, yPos, {
            align: 'center',
            width: pageWidth - 120,
          });
      }

      // Instructor signature line
      if (showInstructor && data.instructorName) {
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

      // Custom footer text
      if (customFooterText) {
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#d1d5db')
          .text(customFooterText, 60, pageHeight - 45, {
            align: 'center',
            width: pageWidth - 120,
          });
      }

      // Verification code at bottom
      if (showVerificationCode) {
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#9ca3af')
          .text(`Verification Code: ${data.verificationCode}`, 60, pageHeight - 60, {
            align: 'center',
            width: pageWidth - 120,
          });
      }

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
