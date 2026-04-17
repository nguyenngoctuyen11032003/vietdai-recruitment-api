import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BackendAppService } from './app.service';

const MAX_MEDIA_FILE_SIZE_BYTES = Number(
  process.env.MEDIA_MAX_FILE_SIZE_BYTES ?? 5 * 1024 * 1024,
);
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

@Controller()
export class AppController {
  constructor(private readonly appService: BackendAppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('auth/login')
  async login(@Body() body: { email?: string; password?: string }) {
    const result = await this.appService.login(body);

    if (!result.ok) {
      throw new HttpException(
        {
          code: result.code,
          message: result.message,
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    return result.data;
  }

  @Post('auth/register')
  async register(
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    },
  ) {
    const result = await this.appService.register(body);

    if (!result.ok) {
      throw new HttpException(
        {
          code: result.code,
          message: result.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return result.data;
  }

  @Post('auth/forgot-password')
  async forgotPassword(@Body() body: { email?: string }) {
    const result = await this.appService.forgotPassword(body);

    if (!result.ok) {
      throw new HttpException(
        {
          code: result.code,
          message: result.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return result.data;
  }

  @Post('auth/reset-password')
  async resetPassword(
    @Body()
    body: {
      token?: string;
      password?: string;
      confirmPassword?: string;
    },
  ) {
    const result = await this.appService.resetPassword(body);

    if (!result.ok) {
      throw new HttpException(
        {
          code: result.code,
          message: result.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return result.data;
  }

  @Post('contact')
  async submitContact(
    @Body()
    body: {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    },
  ) {
    const result = await this.appService.submitContact(body);

    if (!result.ok) {
      throw new HttpException(
        {
          code: result.code,
          message: result.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return result.data;
  }

  @Get('admin/jobs')
  async listAdminJobs() {
    return this.appService.listAdminJobs();
  }

  @Post('admin/jobs')
  async createAdminJob(@Body() body: Record<string, unknown>) {
    return this.appService.createAdminJob(body);
  }

  @Patch('admin/jobs/:id')
  async updateAdminJob(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const result = await this.appService.updateAdminJob(id, body);
    if (!result) {
      throw new HttpException(
        {
          code: 'NOT_FOUND',
          message: 'Job not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return result;
  }

  @Delete('admin/jobs/:id')
  async deleteAdminJob(@Param('id') id: string) {
    return this.appService.deleteAdminJob(id);
  }

  @Get('admin/applications')
  async listAdminApplications() {
    return this.appService.listAdminApplications();
  }

  @Patch('admin/applications/:id/status')
  async updateAdminApplicationStatus(
    @Param('id') id: string,
    @Body() body: { status?: string },
  ) {
    const result = await this.appService.updateAdminApplicationStatus(
      id,
      body.status || 'submitted',
    );
    if (!result) {
      throw new HttpException(
        {
          code: 'NOT_FOUND',
          message: 'Application not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return result;
  }

  @Delete('admin/applications/:id')
  async deleteAdminApplication(@Param('id') id: string) {
    return this.appService.deleteAdminApplication(id);
  }

  @Get('admin/users')
  async listAdminUsers() {
    return this.appService.listAdminUsers();
  }

  @Post('admin/users')
  async createAdminUser(@Body() body: Record<string, unknown>) {
    const result = await this.appService.createAdminUser(body);
    if (
      typeof result === 'object' &&
      result !== null &&
      'error' in result &&
      result.error
    ) {
      throw new HttpException(
        result.error as Record<string, string>,
        HttpStatus.BAD_REQUEST,
      );
    }
    return result;
  }

  @Patch('admin/users/:id')
  async updateAdminUser(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const result = await this.appService.updateAdminUser(id, body);
    if (!result) {
      throw new HttpException(
        {
          code: 'NOT_FOUND',
          message: 'User not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return result;
  }

  @Delete('admin/users/:id')
  async deleteAdminUser(@Param('id') id: string) {
    return this.appService.deleteAdminUser(id);
  }

  @Get('admin/media')
  async listAdminMedia() {
    return this.appService.listAdminMedia();
  }

  @Post('admin/media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_MEDIA_FILE_SIZE_BYTES,
      },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
          callback(
            new BadRequestException({
              code: 'VALIDATION_ERROR',
              message: 'Unsupported file type.',
            }),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async createAdminMedia(
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          originalname: string;
          mimetype: string;
          size: number;
        }
      | undefined,
    @Body() body: { category?: string; altText?: string },
  ) {
    if (!file) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'file is required',
      });
    }

    return this.appService.createAdminMediaFromUpload(file, body);
  }

  @Delete('admin/media/:id')
  async deleteAdminMedia(@Param('id') id: string) {
    return this.appService.deleteAdminMedia(id);
  }

  @Get('admin/reports')
  async listAdminReports() {
    return this.appService.listAdminReports();
  }

  @Post('admin/reports')
  async createAdminReport(@Body() body: Record<string, unknown>) {
    return this.appService.createAdminReport(body);
  }

  @Patch('admin/reports/:id')
  async updateAdminReport(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const result = await this.appService.updateAdminReport(id, body);
    if (!result) {
      throw new HttpException(
        {
          code: 'NOT_FOUND',
          message: 'Report not found.',
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return result;
  }

  @Delete('admin/reports/:id')
  async deleteAdminReport(@Param('id') id: string) {
    return this.appService.deleteAdminReport(id);
  }
}
