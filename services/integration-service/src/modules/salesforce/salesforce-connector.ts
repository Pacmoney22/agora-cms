import { Injectable, Logger } from '@nestjs/common';
import * as jsforce from 'jsforce';
import type {
  ICRMConnector,
  CRMContactData,
  CRMLeadData,
  CRMOpportunityData,
  CRMSyncResult,
  CRMFieldMapping,
} from '@agora-cms/shared';

/**
 * Real Salesforce CRM connector using jsforce library.
 *
 * Requires:
 * - SALESFORCE_LOGIN_URL (e.g., https://login.salesforce.com or https://test.salesforce.com)
 * - SALESFORCE_USERNAME
 * - SALESFORCE_PASSWORD
 * - SALESFORCE_SECURITY_TOKEN (append to password for authentication)
 */
@Injectable()
export class SalesforceConnector implements ICRMConnector {
  private readonly logger = new Logger(SalesforceConnector.name);
  private readonly connection: jsforce.Connection;
  private fieldMappings: CRMFieldMapping[] = [];

  constructor(
    loginUrl: string,
    username: string,
    password: string,
    securityToken: string,
  ) {
    this.connection = new jsforce.Connection({
      loginUrl,
    });

    // Auto-login on initialization
    this.login(username, password + securityToken);

    this.logger.log('Salesforce connector initialized');
  }

  private async login(username: string, passwordWithToken: string): Promise<void> {
    try {
      await this.connection.login(username, passwordWithToken);
      this.logger.log(`Logged into Salesforce as ${username}`);
    } catch (error) {
      this.logger.error(
        `Failed to login to Salesforce: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async syncContact(data: CRMContactData): Promise<CRMSyncResult> {
    try {
      // Check if contact exists by CMS user ID (stored in custom field)
      const existingContacts = await this.connection.sobject('Contact').find({
        CMS_User_ID__c: data.cmsUserId,
      });

      let contactId: string;

      if (existingContacts.length > 0 && existingContacts[0]?.Id) {
        // Update existing contact
        contactId = existingContacts[0]!.Id as string;
        await this.connection.sobject('Contact').update({
          Id: contactId,
          FirstName: data.firstName,
          LastName: data.lastName,
          Email: data.email,
          Phone: data.phone,
          CMS_User_ID__c: data.cmsUserId,
        });

        this.logger.log(`Updated Salesforce Contact ${contactId} for CMS user ${data.cmsUserId}`);
      } else {
        // Create new contact
        const result = await this.connection.sobject('Contact').create({
          FirstName: data.firstName,
          LastName: data.lastName,
          Email: data.email,
          Phone: data.phone,
          CMS_User_ID__c: data.cmsUserId,
        });

        if (!result.success) {
          throw new Error(`Salesforce Contact creation failed: ${JSON.stringify(result.errors)}`);
        }

        contactId = result.id;
        this.logger.log(`Created Salesforce Contact ${contactId} for CMS user ${data.cmsUserId}`);
      }

      return {
        success: true,
        externalId: contactId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync contact: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        success: false,
        externalId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async syncLead(data: CRMLeadData): Promise<CRMSyncResult> {
    try {
      // Leads are always created (no deduplication by CMS form ID in this simple implementation)
      const result = await this.connection.sobject('Lead').create({
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email,
        LeadSource: data.source,
        Description: data.cmsFormId ? `Submitted via CMS form: ${data.cmsFormId}` : undefined,
      });

      if (!result.success) {
        throw new Error(`Salesforce Lead creation failed: ${JSON.stringify(result.errors)}`);
      }

      this.logger.log(`Created Salesforce Lead ${result.id} from ${data.source}`);

      return {
        success: true,
        externalId: result.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync lead: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        success: false,
        externalId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async syncOpportunity(data: CRMOpportunityData): Promise<CRMSyncResult> {
    try {
      // Check if opportunity exists by CMS order ID
      const existingOpportunities = await this.connection.sobject('Opportunity').find({
        CMS_Order_ID__c: data.orderId,
      });

      let opportunityId: string;

      if (existingOpportunities.length > 0 && existingOpportunities[0]?.Id) {
        // Update existing opportunity
        opportunityId = existingOpportunities[0]!.Id as string;
        await this.connection.sobject('Opportunity').update({
          Id: opportunityId,
          Amount: data.amount / 100, // Convert cents to dollars
          StageName: this.mapOrderStatusToSalesforceStage(data.status),
          CMS_Order_ID__c: data.orderId,
        });

        this.logger.log(
          `Updated Salesforce Opportunity ${opportunityId} for order ${data.orderId}`,
        );
      } else {
        // Create new opportunity
        const result = await this.connection.sobject('Opportunity').create({
          Name: `CMS Order ${data.orderId}`,
          ContactId: data.contactId,
          Amount: data.amount / 100, // Convert cents to dollars
          StageName: this.mapOrderStatusToSalesforceStage(data.status),
          CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
          CMS_Order_ID__c: data.orderId,
          Description: `Products:\n${data.products.map((p) => `- ${p.name} x${p.quantity}: $${p.amount / 100}`).join('\n')}`,
        });

        if (!result.success) {
          throw new Error(`Salesforce Opportunity creation failed: ${JSON.stringify(result.errors)}`);
        }

        opportunityId = result.id;
        this.logger.log(
          `Created Salesforce Opportunity ${opportunityId} for order ${data.orderId}`,
        );
      }

      return {
        success: true,
        externalId: opportunityId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to sync opportunity: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );

      return {
        success: false,
        externalId: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getFieldMappings(): Promise<CRMFieldMapping[]> {
    // Return in-memory field mappings
    // In production, these would be stored in database
    return this.fieldMappings;
  }

  async updateFieldMappings(mappings: CRMFieldMapping[]): Promise<void> {
    // Store field mappings in memory
    // In production, these would be persisted to database
    this.fieldMappings = mappings;
    this.logger.log(`Updated ${mappings.length} field mappings`);
  }

  // Helper method to map CMS order status to Salesforce Opportunity Stage
  private mapOrderStatusToSalesforceStage(
    status: 'open' | 'closed_won' | 'closed_lost',
  ): string {
    switch (status) {
      case 'open':
        return 'Prospecting';
      case 'closed_won':
        return 'Closed Won';
      case 'closed_lost':
        return 'Closed Lost';
      default:
        return 'Prospecting';
    }
  }
}
