import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

type LoginBody = {
  accessToken: string;
  refreshToken: string;
  user: { email: string; role: string };
};

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
        const body = response.body as Partial<LoginBody>;
        expect(body.accessToken).toBeDefined();
        expect(body.refreshToken).toBeDefined();
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

  it('/auth/me (GET) - requires valid bearer token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'demo@xkld.vn', password: 'Demo@1234' })
      .expect(201);

    const token = (login.body as LoginBody).accessToken;

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as { email?: string; role?: string };
        expect(body.email).toBe('demo@xkld.vn');
        expect(body.role).toBe('candidate');
      });
  });

  it('/admin/jobs (GET) - denies non-admin role', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'demo@xkld.vn', password: 'Demo@1234' })
      .expect(201);

    const token = (login.body as LoginBody).accessToken;

    await request(app.getHttpServer())
      .get('/admin/jobs')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((response) => {
        const body = response.body as { code?: string };
        expect(body.code).toBe('FORBIDDEN');
      });
  });

  it('/admin/jobs (GET) - allows admin role', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@xkld.vn', password: 'Admin@1234' })
      .expect(201);

    const token = (login.body as LoginBody).accessToken;

    await request(app.getHttpServer())
      .get('/admin/jobs')
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
  });

  it('/auth/refresh + /auth/logout (POST) - rotates and revokes refresh token', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'demo@xkld.vn', password: 'Demo@1234' })
      .expect(201);

    const refreshToken = (login.body as LoginBody).refreshToken;

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(201);

    const newRefreshToken = (refreshed.body as LoginBody).refreshToken;
    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toEqual(refreshToken);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: newRefreshToken })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: newRefreshToken })
      .expect(401)
      .expect((response) => {
        const body = response.body as { code?: string };
        expect(body.code).toBe('UNAUTHORIZED');
      });
  });

  it('/auth/forgot-password + /auth/reset-password (POST) - resets password in test mode', async () => {
    const forgot = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'demo@xkld.vn' })
      .expect(201);

    const forgotBody = forgot.body as { debugResetToken?: string };
    expect(forgotBody.debugResetToken).toBeDefined();

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({
        token: forgotBody.debugResetToken,
        password: 'Reset@1234',
        confirmPassword: 'Reset@1234',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'demo@xkld.vn', password: 'Reset@1234' })
      .expect(201);
  });

  it('/auth/change-password (POST) - changes password and revokes refresh sessions', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@xkld.vn', password: 'Admin@1234' })
      .expect(201);

    const loginBody = login.body as LoginBody;

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        currentPassword: 'Admin@1234',
        newPassword: 'Changed@1234',
        confirmPassword: 'Changed@1234',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: loginBody.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@xkld.vn', password: 'Admin@1234' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@xkld.vn', password: 'Changed@1234' })
      .expect(201);
  });

  afterEach(async () => {
    await app.close();
  });
});
