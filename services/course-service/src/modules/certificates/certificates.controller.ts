import {
  Controller,
  Get,
  Post,
  Body,
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

  @Get()
  @ApiOperation({ summary: 'List all certificates with filtering and pagination' })
  @ApiQuery({ name: 'courseId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of certificates' })
  async findAll(
    @Query('courseId') courseId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.certificatesService.findAll({ courseId, userId, page, limit });
  }

  @Post(':id/regenerate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Regenerate a certificate (deletes old, creates new)' })
  @ApiParam({ name: 'id', type: String, description: 'Certificate UUID' })
  @ApiResponse({ status: 201, description: 'Certificate regenerated successfully' })
  @ApiResponse({ status: 404, description: 'Certificate not found' })
  async regenerateCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body?: { template?: Record<string, any> },
  ) {
    return this.certificatesService.regenerateCertificate(id, body?.template);
  }

  @Post('enrollments/:enrollmentId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a certificate for a completed enrollment' })
  @ApiParam({ name: 'enrollmentId', type: String, description: 'Enrollment UUID' })
  @ApiResponse({ status: 201, description: 'Certificate generated successfully' })
  @ApiResponse({ status: 400, description: 'Enrollment not completed' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async generateCertificate(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() body?: { template?: Record<string, any> },
  ) {
    return this.certificatesService.generateCertificate(enrollmentId, body?.template);
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
