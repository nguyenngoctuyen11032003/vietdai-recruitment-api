import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/auth/login (POST) - happy path', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'demo@xkld.vn', password: 'Demo@1234' })
      .expect(201)
      .expect((response) => {
        const body = response.body as {
          accessToken?: string;
          user?: { email?: string };
        };
        expect(body.accessToken).toBeDefined();
        expect(body.user?.email).toBe('demo@xkld.vn');
      });
  });

  it('/auth/login (POST) - invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'demo@xkld.vn', password: 'wrong-password' })
      .expect(401)
      .expect((response) => {
        const body = response.body as { code?: string };
        expect(body.code).toBe('INVALID_CREDENTIALS');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
