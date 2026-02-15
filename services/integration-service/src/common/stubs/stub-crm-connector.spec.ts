import { StubCRMConnector } from './stub-crm-connector';

describe('StubCRMConnector', () => {
  let connector: StubCRMConnector;

  beforeEach(() => {
    connector = new StubCRMConnector();
  });

  describe('syncContact', () => {
    it('should return a successful sync result with Salesforce-like ID', async () => {
      const result = await connector.syncContact({
        cmsUserId: 'cms_user_123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBeDefined();
      expect(typeof result.externalId).toBe('string');
      expect(result.externalId!.length).toBe(18); // Salesforce ID length
      expect(result.externalId!.startsWith('003')).toBe(true); // Contact prefix
    });

    it('should generate unique IDs for different contacts', async () => {
      const result1 = await connector.syncContact({
        cmsUserId: 'user_1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
      const result2 = await connector.syncContact({
        cmsUserId: 'user_2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      });

      expect(result1.externalId).not.toBe(result2.externalId);
    });
  });

  describe('syncLead', () => {
    it('should return a successful sync result', async () => {
      const result = await connector.syncLead({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        source: 'Website',
        cmsFormId: 'form_123',
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBeDefined();
      expect(result.externalId!.length).toBe(18);
    });

    it('should handle lead without cmsFormId', async () => {
      const result = await connector.syncLead({
        firstName: 'Bob',
        lastName: 'Test',
        email: 'bob@example.com',
        source: 'Referral',
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBeDefined();
    });
  });

  describe('syncOpportunity', () => {
    it('should return a successful sync result', async () => {
      const result = await connector.syncOpportunity({
        orderId: 'order_abc',
        contactId: '003CONTACT',
        amount: 5000,
        status: 'open',
        products: [
          { name: 'Widget', quantity: 2, amount: 2500 },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBeDefined();
      expect(result.externalId!.length).toBe(18);
    });

    it('should handle different statuses', async () => {
      const resultOpen = await connector.syncOpportunity({
        orderId: 'order_1',
        contactId: '003A',
        amount: 1000,
        status: 'open',
        products: [{ name: 'Product', quantity: 1, amount: 1000 }],
      });

      const resultWon = await connector.syncOpportunity({
        orderId: 'order_2',
        contactId: '003B',
        amount: 2000,
        status: 'closed_won',
        products: [{ name: 'Product', quantity: 1, amount: 2000 }],
      });

      const resultLost = await connector.syncOpportunity({
        orderId: 'order_3',
        contactId: '003C',
        amount: 3000,
        status: 'closed_lost',
        products: [{ name: 'Product', quantity: 1, amount: 3000 }],
      });

      expect(resultOpen.success).toBe(true);
      expect(resultWon.success).toBe(true);
      expect(resultLost.success).toBe(true);
    });

    it('should handle multiple products', async () => {
      const result = await connector.syncOpportunity({
        orderId: 'order_multi',
        contactId: '003CONTACT',
        amount: 7500,
        status: 'open',
        products: [
          { name: 'Widget', quantity: 2, amount: 2500 },
          { name: 'Gadget', quantity: 1, amount: 2500 },
          { name: 'Tool', quantity: 5, amount: 2500 },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getFieldMappings', () => {
    it('should return default field mappings', async () => {
      const mappings = await connector.getFieldMappings();

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            cmsField: 'email',
            crmField: 'Email',
            crmObject: 'Contact',
          }),
        ]),
      );
    });

    it('should return a copy of mappings (not mutable reference)', async () => {
      const mappings1 = await connector.getFieldMappings();
      const mappings2 = await connector.getFieldMappings();

      expect(mappings1).toEqual(mappings2);
      expect(mappings1).not.toBe(mappings2); // Different references
    });

    it('should include Contact and Lead mappings', async () => {
      const mappings = await connector.getFieldMappings();

      const contactMappings = mappings.filter((m) => m.crmObject === 'Contact');
      const leadMappings = mappings.filter((m) => m.crmObject === 'Lead');

      expect(contactMappings.length).toBeGreaterThan(0);
      expect(leadMappings.length).toBeGreaterThan(0);
    });
  });

  describe('updateFieldMappings', () => {
    it('should update field mappings', async () => {
      const newMappings = [
        { cmsField: 'custom_field', crmField: 'Custom__c', crmObject: 'Contact' },
      ];

      await connector.updateFieldMappings(newMappings);
      const result = await connector.getFieldMappings();

      expect(result).toEqual(newMappings);
    });

    it('should replace all previous mappings', async () => {
      const original = await connector.getFieldMappings();
      expect(original.length).toBeGreaterThan(1);

      const newMappings = [
        { cmsField: 'single', crmField: 'Single__c', crmObject: 'Lead' },
      ];

      await connector.updateFieldMappings(newMappings);
      const result = await connector.getFieldMappings();

      expect(result).toHaveLength(1);
      expect(result[0]!.cmsField).toBe('single');
    });

    it('should store a copy of mappings (not mutable reference)', async () => {
      const newMappings = [
        { cmsField: 'test', crmField: 'Test__c', crmObject: 'Contact' },
      ];

      await connector.updateFieldMappings(newMappings);

      // Mutate original array - should not affect stored mappings
      newMappings.push({ cmsField: 'extra', crmField: 'Extra__c', crmObject: 'Lead' });

      const result = await connector.getFieldMappings();
      expect(result).toHaveLength(1);
    });

    it('should handle empty mappings array', async () => {
      await connector.updateFieldMappings([]);
      const result = await connector.getFieldMappings();

      expect(result).toEqual([]);
    });
  });
});
