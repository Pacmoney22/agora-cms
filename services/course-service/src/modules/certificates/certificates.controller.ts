import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';

@ApiTags('certificates')
@ApiBearerAuth()
@Controller('api/v1/certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('enrollments/:enrollmentId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a certificate for a completed enrollment' })
  @ApiParam({ name: 'enrollmentId', type: String, description: 'Enrollment UUID' })
  @ApiResponse({ status: 201, description: 'Certificate generated successfully' })
  @ApiResponse({ status: 400, description: 'Enrollment not completed' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async generateCertificate(@Param('enrollmentId', ParseUUIDPipe) enrollmentId: string) {
    return this.certificatesService.generateCertificate(enrollmentId);
  }

  @Get('enrollments/:enrollmentId')
  @ApiOperation({ summary: 'Get certificate by enrollment ID' })
  @ApiParam({ name: 'enrollmentId', type: String, description: 'Enrollment UUID' })
  @ApiResponse({ status: 200, description: 'Certificate found' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async getCertificateByEnrollmentId(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
  ) {
    return this.certificatesService.getCertificateByEnrollmentId(enrollmentId);
  }

  @Get('verify/:code')
  @ApiOperation({ summary: 'Verify a certificate by verification code' })
  @ApiParam({ name: 'code', type: String, description: 'Verification code' })
  @ApiResponse({ status: 200, description: 'Certificate verified' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async verifyCertificate(@Param('code') code: string) {
    return this.certificatesService.verifyCertificate(code);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all certificates for a user' })
  @ApiParam({ name: 'userId', type: String, description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'List of user certificates' })
  async getCertificatesByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.certificatesService.getCertificatesByUserId(userId);
  }
}
