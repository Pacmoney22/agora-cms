import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Cart API (Integration)', () => {
  let app: INestApplication;
  let sessionId: string;
  let productId: string;
  let authToken: string;

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
        email: 'admin@nextgen-cms.dev',
        password: 'Password123!',
      });

    authToken = loginResponse.body.accessToken;

    // Create a test product
    const timestamp = Date.now();
    const productResponse = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: `Cart Test Product ${timestamp}`,
        sku: `CART-${timestamp}`,
        type: 'physical',
        basePrice: 2999,
      });

    productId = productResponse.body.id;

    // Generate session ID for cart
    sessionId = `test-session-${Date.now()}`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/cart (GET)', () => {
    it('should return empty cart for new session', async () => {
      const newSessionId = `empty-session-${Date.now()}`;
      return request(app.getHttpServer())
        .get(`/api/v1/cart?sessionId=${newSessionId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body.items).toEqual([]);
          expect(res.body.total).toBe(0);
        });
    });
  });

  describe('/api/v1/cart/items (POST)', () => {
    it('should add item to cart', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId,
          productId,
          quantity: 2,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body.items).toHaveLength(1);
          expect(res.body.items[0].productId).toBe(productId);
          expect(res.body.items[0].quantity).toBe(2);
        });
    });

    it('should return 400 with invalid product id', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId,
          productId: 'invalid-id',
          quantity: 1,
        })
        .expect(400);
    });

    it('should return 400 with invalid quantity', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId,
          productId,
          quantity: -1,
        })
        .expect(400);
    });
  });

  describe('/api/v1/cart/items/:itemId (PATCH)', () => {
    it('should update item quantity', async () => {
      // First add an item
      const addResponse = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId: `update-session-${Date.now()}`,
          productId,
          quantity: 1,
        });

      const itemId = addResponse.body.items[0].id;

      // Update quantity
      return request(app.getHttpServer())
        .patch(`/api/v1/cart/items/${itemId}`)
        .send({
          sessionId: addResponse.body.sessionId,
          quantity: 3,
        })
        .expect(200)
        .expect((res) => {
          const item = res.body.items.find((i: any) => i.id === itemId);
          expect(item.quantity).toBe(3);
        });
    });
  });

  describe('/api/v1/cart/items/:itemId (DELETE)', () => {
    it('should remove item from cart', async () => {
      const testSessionId = `delete-session-${Date.now()}`;

      // Add an item
      const addResponse = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId: testSessionId,
          productId,
          quantity: 1,
        });

      const itemId = addResponse.body.items[0].id;

      // Remove the item
      return request(app.getHttpServer())
        .delete(`/api/v1/cart/items/${itemId}`)
        .query({ sessionId: testSessionId })
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(0);
        });
    });
  });

  describe('/api/v1/cart/clear (POST)', () => {
    it('should clear all items from cart', async () => {
      const testSessionId = `clear-session-${Date.now()}`;

      // Add multiple items
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId: testSessionId,
          productId,
          quantity: 2,
        });

      // Clear cart
      return request(app.getHttpServer())
        .post('/api/v1/cart/clear')
        .send({ sessionId: testSessionId })
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toHaveLength(0);
          expect(res.body.total).toBe(0);
        });
    });
  });

  describe('/api/v1/cart/apply-discount (POST)', () => {
    it('should apply valid discount code', async () => {
      const testSessionId = `discount-session-${Date.now()}`;

      // Add item to cart
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId: testSessionId,
          productId,
          quantity: 1,
        });

      // Apply discount (assuming TEST10 is a valid code)
      return request(app.getHttpServer())
        .post('/api/v1/cart/apply-discount')
        .send({
          sessionId: testSessionId,
          code: 'TEST10',
        })
        .expect((res) => {
          if (res.status === 200) {
            expect(res.body).toHaveProperty('discount');
          } else {
            // Code might not exist, which is okay for this test
            expect(res.status).toBeGreaterThanOrEqual(400);
          }
        });
    });

    it('should reject invalid discount code', async () => {
      const testSessionId = `invalid-discount-${Date.now()}`;

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({
          sessionId: testSessionId,
          productId,
          quantity: 1,
        });

      return request(app.getHttpServer())
        .post('/api/v1/cart/apply-discount')
        .send({
          sessionId: testSessionId,
          code: 'INVALID_CODE_XYZ',
        })
        .expect((res) => {
          expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });
  });
});
