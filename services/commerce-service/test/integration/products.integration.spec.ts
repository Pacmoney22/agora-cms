import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';

describe('Products API (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Get auth token (assuming auth service is running)
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@agora-cms.dev',
        password: 'Password123!',
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/products (GET)', () => {
    it('should return list of products', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should support pagination', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?page=1&limit=10')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
        });
    });

    it('should filter by product type', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?type=physical')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });

    it('should search products by name', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?search=test')
        .expect(200);
    });
  });

  describe('/api/v1/products (POST)', () => {
    it('should create physical product', async () => {
      const timestamp = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Test Product ${timestamp}`,
          sku: `TEST-${timestamp}`,
          type: 'physical',
          basePrice: 4999,
          description: 'Test product description',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(`Test Product ${timestamp}`);
      expect(response.body.type).toBe('physical');
    });

    it('should create digital product', async () => {
      const timestamp = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Digital Product ${timestamp}`,
          sku: `DIGITAL-${timestamp}`,
          type: 'digital',
          basePrice: 1999,
        })
        .expect(201);

      expect(response.body.type).toBe('digital');
    });

    it('should return 400 with invalid data', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required name
          sku: 'INVALID',
        })
        .expect(400);
    });

    it('should return 409 for duplicate SKU', async () => {
      const timestamp = Date.now();
      const productData = {
        name: `Duplicate Test ${timestamp}`,
        sku: `DUP-${timestamp}`,
        type: 'physical',
        basePrice: 1000,
      };

      await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData)
        .expect(201);

      return request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Different Name',
          sku: productData.sku,
          type: 'physical',
          basePrice: 2000,
        })
        .expect(409);
    });
  });

  describe('/api/v1/products/:id (GET)', () => {
    it('should return product by id', async () => {
      const timestamp = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Get Test ${timestamp}`,
          sku: `GET-${timestamp}`,
          type: 'physical',
          basePrice: 1500,
        });

      const productId = createResponse.body.id;

      return request(app.getHttpServer())
        .get(`/api/v1/products/${productId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(productId);
        });
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/api/v1/products/${fakeId}`)
        .expect(404);
    });
  });

  describe('/api/v1/products/:id (PATCH)', () => {
    it('should update product', async () => {
      const timestamp = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Update Test ${timestamp}`,
          sku: `UPDATE-${timestamp}`,
          type: 'physical',
          basePrice: 2000,
        });

      const productId = createResponse.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          basePrice: 2500,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.basePrice).toBe(2500);
        });
    });
  });

  describe('/api/v1/products/:id (DELETE)', () => {
    it('should delete product', async () => {
      const timestamp = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Delete Test ${timestamp}`,
          sku: `DELETE-${timestamp}`,
          type: 'physical',
          basePrice: 1000,
        });

      const productId = createResponse.body.id;

      await request(app.getHttpServer())
        .delete(`/api/v1/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .get(`/api/v1/products/${productId}`)
        .expect(404);
    });
  });
});
