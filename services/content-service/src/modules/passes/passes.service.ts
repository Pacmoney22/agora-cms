import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * PassesService - Generates Apple Wallet (.pkpass) files for event tickets
 *
 * IMPORTANT: This is a stub implementation for development.
 * For production, you need:
 * 1. Apple Developer account with Pass Type ID
 * 2. Certificate files (signerCert.pem, signerKey.pem, wwdr.pem)
 * 3. Pass template assets (icon.png, logo.png, strip.png, etc.)
 * 4. Device registration endpoints for push notifications
 *
 * References:
 * - Apple Wallet Developer Guide: https://developer.apple.com/wallet/
 * - passkit-generator docs: https://github.com/alexandercerutti/passkit-generator
 */
@Injectable()
export class PassesService {
  private readonly logger = new Logger(PassesService.name);
  private readonly isStubMode: boolean;

  constructor(
    @Inject('PRISMA') private readonly prisma: PrismaClient,
    private readonly configService: ConfigService,
  ) {
    // Check if Apple Wallet certificates are configured
    const passTypeId = this.configService.get<string>('APPLE_PASS_TYPE_ID');
    const teamId = this.configService.get<string>('APPLE_TEAM_ID');
    this.isStubMode = !passTypeId || !teamId;

    if (this.isStubMode) {
      this.logger.warn(
        'Apple Wallet credentials not configured. Running in STUB mode. ' +
          'Set APPLE_PASS_TYPE_ID and APPLE_TEAM_ID to enable real PKPass generation.',
      );
    }
  }

  /**
   * Generate Apple Wallet pass for an event ticket
   */
  async generateTicketPass(ticketId: string): Promise<{ passUrl: string; passSerial: string }> {
    // Fetch ticket with related data
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: {
          include: {
            venue: true,
          },
        },
        ticketType: true,
        attendee: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const passSerial = ticket.passSerial || `TICKET-${randomUUID()}`;

    if (this.isStubMode) {
      return this.generateStubPass(ticket, passSerial);
    }

    // Real PKPass generation
    const { PKPass } = await import('passkit-generator');
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const pass = await PKPass.from({
      model: this.configService.get('APPLE_PASS_TEMPLATE_PATH') || './pass-templates/event-ticket',
      certificates: {
        signerCert: this.configService.get('APPLE_SIGNER_CERT_PATH')!,
        signerKey: this.configService.get('APPLE_SIGNER_KEY_PATH')!,
        wwdr: this.configService.get('APPLE_WWDR_CERT_PATH')!,
      },
      overrides: {
        serialNumber: passSerial,
        organizationName: this.configService.get('APPLE_ORGANIZATION_NAME') || 'Agora CMS',
        description: ticket.event.title,
      },
    });

    // Primary fields (large, front of pass)
    pass.primaryFields.push({
      key: 'event',
      label: 'EVENT',
      value: ticket.event.title,
    });

    // Secondary fields (below primary)
    pass.secondaryFields.push(
      {
        key: 'date',
        label: 'DATE',
        value: ticket.event.startDate.toISOString(),
        dateStyle: 'PKDateStyleMedium' as any,
        timeStyle: 'PKDateStyleShort' as any,
      },
      {
        key: 'location',
        label: 'LOCATION',
        value: ticket.event.venue?.name || 'TBD',
      },
    );

    // Auxiliary fields (smaller text)
    pass.auxiliaryFields.push({
      key: 'ticket-type',
      label: 'TICKET TYPE',
      value: ticket.ticketType.name,
    });

    // Back fields (detailed info)
    pass.backFields.push(
      {
        key: 'attendee',
        label: 'Attendee',
        value: `${ticket.attendee?.firstName} ${ticket.attendee?.lastName}`,
      },
      {
        key: 'confirmation',
        label: 'Confirmation Number',
        value: ticket.ticketNumber,
      },
    );

    // Barcode for check-in
    pass.setBarcodes({
      format: 'PKBarcodeFormatQR',
      message: ticket.qrCode,
      messageEncoding: 'iso-8859-1',
    });

    // Generate .pkpass buffer
    const passBuffer = pass.getAsBuffer();

    // Upload to S3
    const s3Client = new S3Client({
      region: this.configService.get('AWS_REGION') || 'us-east-1',
    });

    const bucketName = this.configService.get('AWS_S3_BUCKET')!;
    const s3Key = `passes/${ticket.eventId}/${passSerial}.pkpass`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: passBuffer,
        ContentType: 'application/vnd.apple.pkpass',
        ACL: 'public-read',
      }),
    );

    const passUrl = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;

    // Update ticket with pass info
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        passUrl,
        passSerial,
      },
    });

    this.logger.log(`Generated PKPass for ticket ${ticket.ticketNumber}: ${passUrl}`);

    return { passUrl, passSerial };
  }

  /**
   * Stub implementation - returns mock pass URL
   */
  private async generateStubPass(
    ticket: any,
    passSerial: string,
  ): Promise<{ passUrl: string; passSerial: string }> {
    this.logger.log(
      `[STUB] Generated Apple Wallet pass for ticket ${ticket.ticketNumber} (${passSerial})`,
    );

    const stubPassUrl = `https://stub.example.com/passes/${passSerial}.pkpass`;

    // Update ticket with stub pass info
    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        passUrl: stubPassUrl,
        passSerial,
      },
    });

    return {
      passUrl: stubPassUrl,
      passSerial,
    };
  }

  /**
   * Register a device for push notifications when pass updates
   * (Apple Wallet Web Service endpoint)
   */
  async registerDevice(
    deviceLibraryIdentifier: string,
    passTypeIdentifier: string,
    serialNumber: string,
    pushToken: string,
  ): Promise<void> {
    this.logger.log(
      `[STUB] Device ${deviceLibraryIdentifier} registered for pass ${serialNumber} with push token ${pushToken}`,
    );

    // TODO: Store device registration
    // - Create DeviceRegistration table
    // - Link device to pass serial number
    // - Store push token for sending updates
    // Example:
    // await this.prisma.deviceRegistration.upsert({
    //   where: {
    //     deviceLibraryIdentifier_serialNumber: {
    //       deviceLibraryIdentifier,
    //       serialNumber,
    //     },
    //   },
    //   update: { pushToken, updatedAt: new Date() },
    //   create: {
    //     deviceLibraryIdentifier,
    //     passTypeIdentifier,
    //     serialNumber,
    //     pushToken,
    //   },
    // });
  }

  /**
   * Unregister a device from pass updates
   */
  async unregisterDevice(
    deviceLibraryIdentifier: string,
    serialNumber: string,
  ): Promise<void> {
    this.logger.log(
      `[STUB] Device ${deviceLibraryIdentifier} unregistered from pass ${serialNumber}`,
    );

    // TODO: Delete device registration
    // await this.prisma.deviceRegistration.delete({
    //   where: {
    //     deviceLibraryIdentifier_serialNumber: {
    //       deviceLibraryIdentifier,
    //       serialNumber,
    //     },
    //   },
    // });
  }

  /**
   * Get list of serial numbers for passes associated with a device
   */
  async getSerialNumbers(
    deviceLibraryIdentifier: string,
    passTypeIdentifier: string,
    passesUpdatedSince?: string,
  ): Promise<{ serialNumbers: string[]; lastModified: string }> {
    this.logger.log(
      `[STUB] Fetching passes for device ${deviceLibraryIdentifier} (updated since: ${passesUpdatedSince || 'never'})`,
    );

    // TODO: Query device registrations and return serial numbers
    // const registrations = await this.prisma.deviceRegistration.findMany({
    //   where: {
    //     deviceLibraryIdentifier,
    //     passTypeIdentifier,
    //     ...(passesUpdatedSince ? {
    //       updatedAt: { gt: new Date(passesUpdatedSince) },
    //     } : {}),
    //   },
    //   select: { serialNumber: true },
    // });

    return {
      serialNumbers: [],
      lastModified: new Date().toISOString(),
    };
  }

  /**
   * Get the latest version of a pass
   */
  async getLatestPass(serialNumber: string): Promise<Buffer> {
    this.logger.log(`[STUB] Fetching latest pass for serial ${serialNumber}`);

    // TODO: Regenerate and return .pkpass file
    // const ticket = await this.prisma.ticket.findUnique({
    //   where: { passSerial: serialNumber },
    //   include: { event: true, ticketType: true, attendee: true },
    // });
    //
    // if (!ticket) {
    //   throw new NotFoundException('Pass not found');
    // }
    //
    // // Regenerate pass with latest data
    // const pass = await this.generateTicketPass(ticket.id);
    // return passBuffer;

    throw new NotFoundException('Pass not found (stub mode)');
  }
}
