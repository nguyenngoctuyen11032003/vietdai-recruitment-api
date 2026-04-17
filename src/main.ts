import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();

  const port = Number(process.env.PORT ?? 3001);
  const uploadDir = process.env.MEDIA_UPLOAD_DIR || 'uploads';
  app.useStaticAssets(join(process.cwd(), uploadDir), { prefix: '/uploads/' });

  await app.listen(port, '0.0.0.0');
  console.log(`Backend running on http://localhost:${port}`);
}
void bootstrap();
