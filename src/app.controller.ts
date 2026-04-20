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
  Req,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BackendAppService } from './app.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';
import type { AuthenticatedRequest } from './auth/auth.types';

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

  @Post('auth/refresh')
  async refresh(@Body() body: { refreshToken?: string }) {
    const result = await this.appService.refreshSession(body);
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

  @Post('auth/logout')
  async logout(@Body() body: { refreshToken?: string }) {
    const result = await this.appService.logout(body);
    return result.data;
  }

  @Get('auth/me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }

  @Post('auth/change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body()
    body: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    },
  ) {
    const userId = request.user?.id;
    if (!userId) {
      throw new HttpException(
        {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized.',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const result = await this.appService.changePassword(userId, body);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async listAdminJobs() {
    return this.appService.listAdminJobs();
  }

  @Post('admin/jobs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createAdminJob(@Body() body: Record<string, unknown>) {
    return this.appService.createAdminJob(body);
  }

  @Patch('admin/jobs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteAdminJob(@Param('id') id: string) {
    return this.appService.deleteAdminJob(id);
  }

  @Get('admin/applications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async listAdminApplications() {
    return this.appService.listAdminApplications();
  }

  @Patch('admin/applications/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteAdminApplication(@Param('id') id: string) {
    return this.appService.deleteAdminApplication(id);
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async listAdminUsers() {
    return this.appService.listAdminUsers();
  }

  @Post('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteAdminUser(@Param('id') id: string) {
    return this.appService.deleteAdminUser(id);
  }

  @Get('admin/media')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async listAdminMedia() {
    return this.appService.listAdminMedia();
  }

  @Post('admin/media')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteAdminMedia(@Param('id') id: string) {
    return this.appService.deleteAdminMedia(id);
  }

  @Get('admin/reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async listAdminReports() {
    return this.appService.listAdminReports();
  }

  @Post('admin/reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async createAdminReport(@Body() body: Record<string, unknown>) {
    return this.appService.createAdminReport(body);
  }

  @Patch('admin/reports/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async deleteAdminReport(@Param('id') id: string) {
    return this.appService.deleteAdminReport(id);
  }
}
