import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../../src/app.module';

describe('Pages API (Integration)', () => {
  let app: INestApplication;
  let authToken: string;
  let testPageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Login to get authentication token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@agora-cms.dev',
        password: 'Password123!',
      });

    expect(loginResponse.status).toBe(200);
    authToken = loginResponse.body.accessToken;
    expect(authToken).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/pages (GET)', () => {
    it('should return list of pages', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should return 401 without authentication', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/pages')
        .expect(401);
    });

    it('should support pagination', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/pages?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('meta');
          expect(res.body.meta).toHaveProperty('page');
          expect(res.body.meta).toHaveProperty('limit');
        });
    });

    it('should filter pages by status', async () => {
      return request(app.getHttpServer())
        .get('/api/v1/pages?status=published')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
        });
    });
  });

  describe('/api/v1/pages (POST)', () => {
    it('should create new page with valid data', async () => {
      const timestamp = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Integration Test Page ${timestamp}`,
          slug: `/integration-test-${timestamp}`,
          content: {
            blocks: [
              {
                type: 'text',
                content: 'This is a test page',
              },
            ],
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(`Integration Test Page ${timestamp}`);
      expect(response.body.slug).toBe(`/integration-test-${timestamp}`);

      // Save for cleanup
      testPageId = response.body.id;
    });

    it('should return 400 with invalid data', async () => {
      return request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required title field
          slug: '/invalid-page',
        })
        .expect(400);
    });

    it('should return 409 for duplicate slug', async () => {
      const timestamp = Date.now();
      const pageData = {
        title: `Duplicate Test ${timestamp}`,
        slug: `/duplicate-test-${timestamp}`,
      };

      // Create first page
      await request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(pageData)
        .expect(201);

      // Try to create duplicate
      return request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Different Title',
          slug: pageData.slug, // Same slug
        })
        .expect(409);
    });
  });

  describe('/api/v1/pages/:id (GET)', () => {
    it('should return page by id', async () => {
      // First create a page
      const timestamp = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Test Page ${timestamp}`,
          slug: `/test-${timestamp}`,
        });

      const pageId = createResponse.body.id;

      // Now retrieve it
      return request(app.getHttpServer())
        .get(`/api/v1/pages/${pageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(pageId);
          expect(res.body.title).toBe(`Test Page ${timestamp}`);
        });
    });

    it('should return 404 for non-existent page', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .get(`/api/v1/pages/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/pages/:id (PATCH)', () => {
    it('should update page', async () => {
      // Create a page first
      const timestamp = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Original Title ${timestamp}`,
          slug: `/original-${timestamp}`,
        });

      const pageId = createResponse.body.id;

      // Update the page
      return request(app.getHttpServer())
        .patch(`/api/v1/pages/${pageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Updated Title ${timestamp}`,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe(`Updated Title ${timestamp}`);
        });
    });

    it('should return 404 when updating non-existent page', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .patch(`/api/v1/pages/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
        })
        .expect(404);
    });
  });

  describe('/api/v1/pages/:id (DELETE)', () => {
    it('should delete page', async () => {
      // Create a page first
      const timestamp = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Page to Delete ${timestamp}`,
          slug: `/delete-${timestamp}`,
        });

      const pageId = createResponse.body.id;

      // Delete the page
      await request(app.getHttpServer())
        .delete(`/api/v1/pages/${pageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify it's deleted
      return request(app.getHttpServer())
        .get(`/api/v1/pages/${pageId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent page', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      return request(app.getHttpServer())
        .delete(`/api/v1/pages/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/api/v1/pages/:id/publish (POST)', () => {
    it('should publish page', async () => {
      // Create a page first
      const timestamp = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Page to Publish ${timestamp}`,
          slug: `/publish-${timestamp}`,
        });

      const pageId = createResponse.body.id;

      // Publish the page
      return request(app.getHttpServer())
        .post(`/api/v1/pages/${pageId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('published');
          expect(res.body.publishedAt).toBeDefined();
        });
    });
  });

  describe('/api/v1/pages/:id/unpublish (POST)', () => {
    it('should unpublish page', async () => {
      // Create and publish a page
      const timestamp = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/pages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: `Page to Unpublish ${timestamp}`,
          slug: `/unpublish-${timestamp}`,
        });

      const pageId = createResponse.body.id;

      await request(app.getHttpServer())
        .post(`/api/v1/pages/${pageId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Unpublish the page
      return request(app.getHttpServer())
        .post(`/api/v1/pages/${pageId}/unpublish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('draft');
        });
    });
  });
});
