import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  ICRMConnector,
  CRMContactData,
  CRMLeadData,
  CRMOpportunityData,
  CRMSyncResult,
  CRMFieldMapping,
} from '@agora-cms/shared';

/**
 * Stub implementation of ICRMConnector for local development.
 * Logs sync operations and returns mock Salesforce record IDs.
 */
@Injectable()
export class StubCRMConnector implements ICRMConnector {
  private readonly logger = new Logger(StubCRMConnector.name);

  private fieldMappings: CRMFieldMapping[] = [
    {
      cmsField: 'email',
      crmField: 'Email',
      crmObject: 'Contact',
    },
    {
      cmsField: 'firstName',
      crmField: 'FirstName',
      crmObject: 'Contact',
    },
    {
      cmsField: 'lastName',
      crmField: 'LastName',
      crmObject: 'Contact',
    },
    {
      cmsField: 'phone',
      crmField: 'Phone',
      crmObject: 'Contact',
    },
    {
      cmsField: 'email',
      crmField: 'Email',
      crmObject: 'Lead',
    },
    {
      cmsField: 'source',
      crmField: 'LeadSource',
      crmObject: 'Lead',
    },
  ];

  private generateSalesforceId(): string {
    // Salesforce IDs are 18 alphanumeric characters
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const prefix = '003'; // Contact prefix for realism
    let result = prefix;
    for (let i = 0; i < 15; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async syncContact(data: CRMContactData): Promise<CRMSyncResult> {
    const externalId = this.generateSalesforceId();

    this.logger.log(
      `[STUB] Synced Contact: ${data.firstName} ${data.lastName} (${data.email}) -> SF ID: ${externalId}`,
    );

    return {
      success: true,
      externalId,
    };
  }

  async syncLead(data: CRMLeadData): Promise<CRMSyncResult> {
    const externalId = this.generateSalesforceId();

    this.logger.log(
      `[STUB] Synced Lead: ${data.firstName} ${data.lastName} (${data.email}) from ${data.source} -> SF ID: ${externalId}`,
    );

    return {
      success: true,
      externalId,
    };
  }

  async syncOpportunity(data: CRMOpportunityData): Promise<CRMSyncResult> {
    const externalId = this.generateSalesforceId();

    this.logger.log(
      `[STUB] Synced Opportunity: Order ${data.orderId} for Contact ${data.contactId} ` +
        `($${(data.amount / 100).toFixed(2)}, ${data.status}) ` +
        `with ${data.products.length} product(s) -> SF ID: ${externalId}`,
    );

    return {
      success: true,
      externalId,
    };
  }

  async getFieldMappings(): Promise<CRMFieldMapping[]> {
    this.logger.log(`[STUB] Fetching ${this.fieldMappings.length} field mappings`);
    return [...this.fieldMappings];
  }

  async updateFieldMappings(mappings: CRMFieldMapping[]): Promise<void> {
    this.fieldMappings = [...mappings];
    this.logger.log(`[STUB] Updated field mappings (${mappings.length} mappings)`);
  }
}
