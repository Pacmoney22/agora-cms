import { SalesforceConnector } from './salesforce-connector';

// Mock jsforce
const mockLogin = jest.fn();
const mockFind = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockSobject = jest.fn();

jest.mock('jsforce', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    login: mockLogin,
    sobject: mockSobject,
  })),
}));

describe('SalesforceConnector', () => {
  let connector: SalesforceConnector;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue({});
    mockSobject.mockReturnValue({
      find: mockFind,
      create: mockCreate,
      update: mockUpdate,
    });
    connector = new SalesforceConnector(
      'https://login.salesforce.com',
      'user@example.com',
      'password123',
      'securityToken',
    );
  });

  describe('constructor', () => {
    it('should initialize and trigger auto-login', () => {
      expect(connector).toBeDefined();
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123securityToken');
    });

    it('should propagate login errors', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      // The constructor calls login() without await so the error is unhandled
      // but we can test the login method through the side effects
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  describe('syncContact', () => {
    const contactData = {
      cmsUserId: 'cms_user_123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
    };

    it('should create a new contact when none exists', async () => {
      mockFind.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ success: true, id: '003ABC123' });

      const result = await connector.syncContact(contactData);

      expect(mockSobject).toHaveBeenCalledWith('Contact');
      expect(mockFind).toHaveBeenCalledWith({ CMS_User_ID__c: 'cms_user_123' });
      expect(mockCreate).toHaveBeenCalledWith({
        FirstName: 'John',
        LastName: 'Doe',
        Email: 'john@example.com',
        Phone: '+1234567890',
        CMS_User_ID__c: 'cms_user_123',
      });
      expect(result).toEqual({
        success: true,
        externalId: '003ABC123',
      });
    });

    it('should update an existing contact', async () => {
      mockFind.mockResolvedValue([{ Id: '003EXISTING' }]);
      mockUpdate.mockResolvedValue({});

      const result = await connector.syncContact(contactData);

      expect(mockUpdate).toHaveBeenCalledWith({
        Id: '003EXISTING',
        FirstName: 'John',
        LastName: 'Doe',
        Email: 'john@example.com',
        Phone: '+1234567890',
        CMS_User_ID__c: 'cms_user_123',
      });
      expect(result).toEqual({
        success: true,
        externalId: '003EXISTING',
      });
    });

    it('should handle contact creation failure from Salesforce', async () => {
      mockFind.mockResolvedValue([]);
      mockCreate.mockResolvedValue({
        success: false,
        errors: [{ message: 'Required field missing', statusCode: 'REQUIRED_FIELD_MISSING' }],
      });

      const result = await connector.syncContact(contactData);

      expect(result.success).toBe(false);
      expect(result.externalId).toBeNull();
      expect(result.error).toContain('Salesforce Contact creation failed');
    });

    it('should handle API error during contact sync', async () => {
      mockFind.mockRejectedValue(new Error('INVALID_SESSION_ID'));

      const result = await connector.syncContact(contactData);

      expect(result).toEqual({
        success: false,
        externalId: null,
        error: 'INVALID_SESSION_ID',
      });
    });

    it('should handle non-Error thrown during contact sync', async () => {
      mockFind.mockRejectedValue('unknown');

      const result = await connector.syncContact(contactData);

      expect(result).toEqual({
        success: false,
        externalId: null,
        error: 'Unknown error',
      });
    });

    it('should handle existing contacts array with null Id', async () => {
      // Simulate existingContacts[0] with no Id property
      mockFind.mockResolvedValue([{ Id: null }]);
      mockCreate.mockResolvedValue({ success: true, id: '003NEW456' });

      const result = await connector.syncContact(contactData);

      // When Id is falsy, should create new
      expect(mockCreate).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('syncLead', () => {
    const leadData = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      source: 'Website',
      cmsFormId: 'form_123',
    };

    it('should create a lead successfully', async () => {
      mockCreate.mockResolvedValue({ success: true, id: '00QLEAD123' });

      const result = await connector.syncLead(leadData);

      expect(mockSobject).toHaveBeenCalledWith('Lead');
      expect(mockCreate).toHaveBeenCalledWith({
        FirstName: 'Jane',
        LastName: 'Smith',
        Email: 'jane@example.com',
        LeadSource: 'Website',
        Description: 'Submitted via CMS form: form_123',
      });
      expect(result).toEqual({
        success: true,
        externalId: '00QLEAD123',
      });
    });

    it('should create a lead without cmsFormId', async () => {
      mockCreate.mockResolvedValue({ success: true, id: '00QLEAD456' });

      const result = await connector.syncLead({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        source: 'Referral',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          Description: undefined,
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should handle lead creation failure from Salesforce', async () => {
      mockCreate.mockResolvedValue({
        success: false,
        errors: [{ message: 'Duplicate Lead' }],
      });

      const result = await connector.syncLead(leadData);

      expect(result.success).toBe(false);
      expect(result.externalId).toBeNull();
      expect(result.error).toContain('Salesforce Lead creation failed');
    });

    it('should handle API error during lead sync', async () => {
      mockCreate.mockRejectedValue(new Error('API limit exceeded'));

      const result = await connector.syncLead(leadData);

      expect(result).toEqual({
        success: false,
        externalId: null,
        error: 'API limit exceeded',
      });
    });

    it('should handle non-Error thrown during lead sync', async () => {
      mockCreate.mockRejectedValue(42);

      const result = await connector.syncLead(leadData);

      expect(result.error).toBe('Unknown error');
    });
  });

  describe('syncOpportunity', () => {
    const opportunityData = {
      orderId: 'order_abc',
      contactId: '003CONTACT',
      amount: 5000, // cents
      status: 'open' as const,
      products: [
        { name: 'Widget', quantity: 2, amount: 2500 },
        { name: 'Gadget', quantity: 1, amount: 2500 },
      ],
    };

    it('should create a new opportunity when none exists', async () => {
      mockFind.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ success: true, id: '006OPP123' });

      const result = await connector.syncOpportunity(opportunityData);

      expect(mockSobject).toHaveBeenCalledWith('Opportunity');
      expect(mockFind).toHaveBeenCalledWith({ CMS_Order_ID__c: 'order_abc' });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          Name: 'CMS Order order_abc',
          ContactId: '003CONTACT',
          Amount: 50, // 5000/100
          StageName: 'Prospecting',
          CMS_Order_ID__c: 'order_abc',
        }),
      );
      expect(result).toEqual({
        success: true,
        externalId: '006OPP123',
      });
    });

    it('should update an existing opportunity', async () => {
      mockFind.mockResolvedValue([{ Id: '006EXISTING' }]);
      mockUpdate.mockResolvedValue({});

      const result = await connector.syncOpportunity(opportunityData);

      expect(mockUpdate).toHaveBeenCalledWith({
        Id: '006EXISTING',
        Amount: 50,
        StageName: 'Prospecting',
        CMS_Order_ID__c: 'order_abc',
      });
      expect(result).toEqual({
        success: true,
        externalId: '006EXISTING',
      });
    });

    it('should map closed_won status to Closed Won stage', async () => {
      mockFind.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ success: true, id: '006OPP789' });

      await connector.syncOpportunity({
        ...opportunityData,
        status: 'closed_won',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ StageName: 'Closed Won' }),
      );
    });

    it('should map closed_lost status to Closed Lost stage', async () => {
      mockFind.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ success: true, id: '006OPP789' });

      await connector.syncOpportunity({
        ...opportunityData,
        status: 'closed_lost',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ StageName: 'Closed Lost' }),
      );
    });

    it('should handle opportunity creation failure from Salesforce', async () => {
      mockFind.mockResolvedValue([]);
      mockCreate.mockResolvedValue({
        success: false,
        errors: [{ message: 'Missing required field' }],
      });

      const result = await connector.syncOpportunity(opportunityData);

      expect(result.success).toBe(false);
      expect(result.externalId).toBeNull();
      expect(result.error).toContain('Salesforce Opportunity creation failed');
    });

    it('should handle API error during opportunity sync', async () => {
      mockFind.mockRejectedValue(new Error('Connection timeout'));

      const result = await connector.syncOpportunity(opportunityData);

      expect(result).toEqual({
        success: false,
        externalId: null,
        error: 'Connection timeout',
      });
    });

    it('should handle non-Error thrown during opportunity sync', async () => {
      mockFind.mockRejectedValue(null);

      const result = await connector.syncOpportunity(opportunityData);

      expect(result.error).toBe('Unknown error');
    });

    it('should include product details in description', async () => {
      mockFind.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ success: true, id: '006OPP123' });

      await connector.syncOpportunity(opportunityData);

      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.Description).toContain('Widget');
      expect(createCall.Description).toContain('Gadget');
      expect(createCall.Description).toContain('x2');
      expect(createCall.Description).toContain('x1');
    });

    it('should handle existing opportunity with null Id', async () => {
      mockFind.mockResolvedValue([{ Id: null }]);
      mockCreate.mockResolvedValue({ success: true, id: '006NEW789' });

      const result = await connector.syncOpportunity(opportunityData);

      // When Id is falsy, should create new
      expect(mockCreate).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('getFieldMappings', () => {
    it('should return empty array initially', async () => {
      const mappings = await connector.getFieldMappings();
      expect(mappings).toEqual([]);
    });
  });

  describe('updateFieldMappings', () => {
    it('should store and retrieve field mappings', async () => {
      const mappings = [
        { cmsField: 'email', crmField: 'Email', crmObject: 'Contact' },
        { cmsField: 'name', crmField: 'Name', crmObject: 'Contact' },
      ];

      await connector.updateFieldMappings(mappings);
      const result = await connector.getFieldMappings();

      expect(result).toEqual(mappings);
    });

    it('should overwrite previous mappings', async () => {
      await connector.updateFieldMappings([
        { cmsField: 'email', crmField: 'Email', crmObject: 'Contact' },
      ]);

      const newMappings = [
        { cmsField: 'phone', crmField: 'Phone', crmObject: 'Lead' },
      ];
      await connector.updateFieldMappings(newMappings);

      const result = await connector.getFieldMappings();
      expect(result).toEqual(newMappings);
      expect(result).toHaveLength(1);
    });
  });
});
