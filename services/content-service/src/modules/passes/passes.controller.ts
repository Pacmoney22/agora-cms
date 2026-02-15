import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PassesService } from './passes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('passes')
@Controller('api/v1/passes')
export class PassesController {
  constructor(private readonly passesService: PassesService) {}

  @Post('tickets/:ticketId/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate Apple Wallet pass for event ticket',
    description: 'Creates a .pkpass file for the specified ticket and returns the download URL',
  })
  @ApiResponse({ status: 201, description: 'Pass generated successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async generateTicketPass(
    @Param('ticketId') ticketId: string,
    @Request() req: any,
  ) {
    // TODO: Verify user owns this ticket or has permission
    const result = await this.passesService.generateTicketPass(ticketId);
    return {
      passUrl: result.passUrl,
      serialNumber: result.passSerial,
    };
  }

  // ============================================================
  // Apple Wallet Web Service Endpoints
  // (Required for pass updates and device registrations)
  // ============================================================

  @Post('v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register device for pass updates',
    description: 'Apple Wallet calls this when a user adds a pass to their device',
  })
  @ApiResponse({ status: 201, description: 'Device registered successfully' })
  async registerDevice(
    @Param('deviceLibraryIdentifier') deviceLibraryIdentifier: string,
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Param('serialNumber') serialNumber: string,
    @Body('pushToken') pushToken: string,
    @Headers('authorization') authorization: string,
  ) {
    // TODO: Validate authorization token matches pass
    await this.passesService.registerDevice(
      deviceLibraryIdentifier,
      passTypeIdentifier,
      serialNumber,
      pushToken,
    );

    return { success: true };
  }

  @Delete('v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unregister device from pass updates',
    description: 'Apple Wallet calls this when a user removes a pass from their device',
  })
  @ApiResponse({ status: 200, description: 'Device unregistered successfully' })
  async unregisterDevice(
    @Param('deviceLibraryIdentifier') deviceLibraryIdentifier: string,
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Param('serialNumber') serialNumber: string,
    @Headers('authorization') authorization: string,
  ) {
    // TODO: Validate authorization token matches pass
    await this.passesService.unregisterDevice(deviceLibraryIdentifier, serialNumber);

    return { success: true };
  }

  @Get('v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier')
  @ApiOperation({
    summary: 'Get list of updatable passes for device',
    description: 'Apple Wallet calls this to check for pass updates',
  })
  @ApiResponse({ status: 200, description: 'Serial numbers returned' })
  @ApiResponse({ status: 204, description: 'No passes to update' })
  async getSerialNumbers(
    @Param('deviceLibraryIdentifier') deviceLibraryIdentifier: string,
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Headers('authorization') authorization: string,
    @Headers('if-modified-since') ifModifiedSince?: string,
  ) {
    const result = await this.passesService.getSerialNumbers(
      deviceLibraryIdentifier,
      passTypeIdentifier,
      ifModifiedSince,
    );

    if (result.serialNumbers.length === 0) {
      // Return 204 No Content if no updates
      return null;
    }

    return {
      serialNumbers: result.serialNumbers,
      lastModified: result.lastModified,
    };
  }

  @Get('v1/passes/:passTypeIdentifier/:serialNumber')
  @ApiOperation({
    summary: 'Get latest version of pass',
    description: 'Apple Wallet calls this to download updated pass',
  })
  @ApiResponse({ status: 200, description: 'Pass file returned', type: Buffer })
  @ApiResponse({ status: 304, description: 'Pass not modified' })
  @ApiResponse({ status: 404, description: 'Pass not found' })
  async getLatestPass(
    @Param('passTypeIdentifier') passTypeIdentifier: string,
    @Param('serialNumber') serialNumber: string,
    @Headers('authorization') authorization: string,
    @Headers('if-modified-since') ifModifiedSince?: string,
  ) {
    // TODO: Check if pass has been modified since ifModifiedSince
    // If not modified, return 304

    try {
      const passBuffer = await this.passesService.getLatestPass(serialNumber);

      // Return .pkpass file with correct content type
      return {
        buffer: passBuffer,
        contentType: 'application/vnd.apple.pkpass',
      };
    } catch (error) {
      throw new NotFoundException('Pass not found');
    }
  }

  @Post('v1/log')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log error messages from devices',
    description: 'Apple Wallet sends error logs here (optional endpoint)',
  })
  async logError(@Body() logs: string[]) {
    // Log errors for debugging
    console.error('Apple Wallet device errors:', logs);
    return { success: true };
  }
}
