import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Orders API (Integration)', () => {
  let app: INestApplication;
  let authToken: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@agora-cms.dev',
        password: 'Password123!',
      });

    authToken = loginResponse.body.accessToken;

    // Create a test product
    const timestamp = Date.now();
    const productResponse = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `Order Test Product ${timestamp}`,
        sku: `ORDER-${timestamp}`,
        type: 'physical',
        basePrice: 4999,
      });

    productId = productResponse.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/orders (POST)', () => {
    it('should create order from cart', async () => {
      const sessionId = `order-session-${Date.now()}`;
      const timestamp = Date.now();

      // Add item to cart
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId,
          productId,
          quantity: 1,
        });

      // Create order
      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          sessionId,
          customerEmail: `test${timestamp}@example.com`,
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            line1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'US',
          },
          billingAddress: {
            firstName: 'Test',
            lastName: 'User',
            line1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'US',
          },
          paymentMethod: {
            type: 'card',
            last4: '4242',
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('orderNumber');
          expect(res.body.status).toBe('pending');
          expect(res.body.items).toHaveLength(1);
        });
    });

    it('should return 400 with invalid shipping address', async () => {
      const sessionId = `invalid-address-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId,
          productId,
          quantity: 1,
        });

      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          sessionId,
          customerEmail: 'test@example.com',
          // Missing shipping address
        })
        .expect(400);
    });

    it('should return 400 for empty cart', async () => {
      const emptySessionId = `empty-cart-${Date.now()}`;

      return request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          sessionId: emptySessionId,
          customerEmail: 'test@example.com',
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            line1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'US',
          },
        })
        .expect(400);
    });
  });

  describe('/api/v1/orders (GET)', () => {
    it('should return list of orders for authenticated user', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should support pagination', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('page');
        });
    });

    it('should filter by order status', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/orders?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('/api/v1/orders/:id (GET)', () => {
    it('should return order by id', async () => {
      // Create an order first
      const sessionId = `get-order-${Date.now()}`;
      const timestamp = Date.now();

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId,
          productId,
          quantity: 1,
        });

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          sessionId,
          customerEmail: `test${timestamp}@example.com`,
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            line1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'US',
          },
        });

      const orderId = createResponse.body.id;

      return request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(orderId);
        });
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/api/v1/orders/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/orders/:id/status (PATCH)', () => {
    it('should update order status', async () => {
      // Create an order
      const sessionId = `status-update-${Date.now()}`;
      const timestamp = Date.now();

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId,
          productId,
          quantity: 1,
        });

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          sessionId,
          customerEmail: `test${timestamp}@example.com`,
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            line1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'US',
          },
        });

      const orderId = createResponse.body.id;

      // Update status
      return request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'processing',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('processing');
        });
    });

    it('should return 400 for invalid status', async () => {
      const sessionId = `invalid-status-${Date.now()}`;
      const timestamp = Date.now();

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId,
          productId,
          quantity: 1,
        });

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          sessionId,
          customerEmail: `test${timestamp}@example.com`,
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            line1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'US',
          },
        });

      const orderId = createResponse.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'invalid_status',
        })
        .expect(400);
    });
  });

  describe('/api/v1/orders/:id/cancel (POST)', () => {
    it('should cancel order', async () => {
      const sessionId = `cancel-order-${Date.now()}`;
      const timestamp = Date.now();

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId,
          productId,
          quantity: 1,
        });

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          sessionId,
          customerEmail: `test${timestamp}@example.com`,
          shippingAddress: {
            firstName: 'Test',
            lastName: 'User',
            line1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            postalCode: '12345',
            country: 'US',
          },
        });

      const orderId = createResponse.body.id;

      return request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('cancelled');
        });
    });
  });
});
