import { Inject, Injectable, Optional } from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { DataSource, IsNull, MoreThan } from 'typeorm';
import {
  ApplicationEntity,
  ContactTicketEntity,
  JobEntity,
  MediaAssetEntity,
  PasswordResetTokenEntity,
  ReportEntity,
  UserEntity,
} from './database/entities';
import { sanitizeRichText } from './common/sanitize-rich-text';
import { MEDIA_STORAGE_PROVIDER } from './media/storage.provider';
import type { MediaStorageProvider } from './media/storage.provider';
import { validateImageUpload } from './media/upload-validation';

type UserRecord = {
  id: string;
  email: string;
  fullName: string;
  password: string;
};

const scrypt = promisify(scryptCallback);

const toTitleCase = (value: string) =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

@Injectable()
export class BackendAppService {
  private users: UserRecord[] = [
    {
      id: '1',
      email: 'demo@xkld.vn',
      fullName: 'Demo User',
      password: 'Demo@1234',
    },
  ];

  constructor(
    @Optional() @Inject(DataSource) private readonly dataSource?: DataSource,
    @Optional()
    @Inject(MEDIA_STORAGE_PROVIDER)
    private readonly mediaStorageProvider?: MediaStorageProvider,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async login(input: { email?: string; password?: string }) {
    const email = (input.email || '').trim().toLowerCase();
    const password = input.password || '';

    if (!email || !password) {
      return {
        ok: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is invalid.',
      };
    }

    if (this.hasDatabase()) {
      const repository = this.dataSource!.getRepository(UserEntity);
      const user = await repository.findOne({ where: { email } });

      if (!user || !user.isActive) {
        return {
          ok: false,
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is invalid.',
        };
      }

      const isValidPassword = await this.verifyPassword(
        password,
        user.passwordHash,
      );

      if (!isValidPassword) {
        return {
          ok: false,
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is invalid.',
        };
      }

      return {
        ok: true,
        data: this.buildAuthResponseFromDbUser(user),
      };
    }

    const user = this.users.find(
      (item) =>
        item.email.toLowerCase() === email && item.password === password,
    );

    if (!user) {
      return {
        ok: false,
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is invalid.',
      };
    }

    return {
      ok: true,
      data: this.buildAuthResponseFromFallbackUser(user),
    };
  }

  async register(input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }) {
    const firstName = (input.firstName || '').trim();
    const lastName = (input.lastName || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    const password = input.password || '';
    const confirmPassword = input.confirmPassword || '';

    if (!firstName || !lastName || !email || !password) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Missing required fields.',
      };
    }

    if (password.length < 8) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters.',
      };
    }

    if (password !== confirmPassword) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Password confirmation does not match.',
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format.',
      };
    }

    if (this.hasDatabase()) {
      const repository = this.dataSource!.getRepository(UserEntity);
      const existed = await repository.findOne({ where: { email } });

      if (existed) {
        return {
          ok: false,
          code: 'EMAIL_EXISTS',
          message: 'Email is already registered.',
        };
      }

      const passwordHash = await this.hashPassword(password);
      const created = repository.create({
        email,
        fullName: `${firstName} ${lastName}`.trim(),
        passwordHash,
        role: 'candidate',
        status: 'active',
        isVerified: false,
        isActive: true,
      });

      const saved = await repository.save(created);
      return {
        ok: true,
        data: this.buildAuthResponseFromDbUser(saved),
      };
    }

    const existed = this.users.some((item) => item.email.toLowerCase() === email);

    if (existed) {
      return {
        ok: false,
        code: 'EMAIL_EXISTS',
        message: 'Email is already registered.',
      };
    }

    const user: UserRecord = {
      id: String(this.users.length + 1),
      email,
      fullName: `${firstName} ${lastName}`.trim(),
      password,
    };

    this.users.unshift(user);

    return {
      ok: true,
      data: this.buildAuthResponseFromFallbackUser(user),
    };
  }

  async forgotPassword(input: { email?: string }) {
    const email = (input.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Please provide a valid email.',
      };
    }

    if (this.hasDatabase()) {
      const userRepository = this.dataSource!.getRepository(UserEntity);
      const tokenRepository =
        this.dataSource!.getRepository(PasswordResetTokenEntity);
      const user = await userRepository.findOne({ where: { email } });

      if (user) {
        const token = randomBytes(32).toString('hex');
        const tokenHash = await this.hashPassword(token);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

        const tokenEntity = tokenRepository.create({
          userId: user.id,
          tokenHash,
          expiresAt,
          usedAt: null,
        });
        await tokenRepository.save(tokenEntity);
      }
    }

    return {
      ok: true,
      data: {
        message: 'Password reset link has been sent if your email exists.',
      },
    };
  }

  async resetPassword(input: {
    token?: string;
    password?: string;
    confirmPassword?: string;
  }) {
    const token = (input.token || '').trim();
    const password = input.password || '';
    const confirmPassword = input.confirmPassword || '';

    if (!token || !password || !confirmPassword) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Token, password and confirmPassword are required.',
      };
    }

    if (password.length < 8) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters.',
      };
    }

    if (password !== confirmPassword) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Password confirmation does not match.',
      };
    }

    if (!this.hasDatabase()) {
      return {
        ok: false,
        code: 'NOT_AVAILABLE',
        message: 'Password reset is unavailable while database is offline.',
      };
    }

    const tokenRepository = this.dataSource!.getRepository(PasswordResetTokenEntity);
    const userRepository = this.dataSource!.getRepository(UserEntity);

    const activeTokens = await tokenRepository.find({
      where: {
        usedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    let matchedToken: PasswordResetTokenEntity | null = null;
    for (const item of activeTokens) {
      const matched = await this.verifyPassword(token, item.tokenHash);
      if (matched) {
        matchedToken = item;
        break;
      }
    }

    if (!matchedToken) {
      return {
        ok: false,
        code: 'INVALID_TOKEN',
        message: 'Reset token is invalid or expired.',
      };
    }

    const user = await userRepository.findOne({ where: { id: matchedToken.userId } });
    if (!user) {
      return {
        ok: false,
        code: 'INVALID_TOKEN',
        message: 'Reset token is invalid or expired.',
      };
    }

    user.passwordHash = await this.hashPassword(password);
    await userRepository.save(user);

    matchedToken.usedAt = new Date();
    await tokenRepository.save(matchedToken);

    return {
      ok: true,
      data: {
        message: 'Password has been reset successfully.',
      },
    };
  }

  async submitContact(input: {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
  }) {
    const name = (input.name || '').trim();
    const email = (input.email || '').trim();
    const subject = (input.subject || '').trim();
    const message = (input.message || '').trim();

    if (!name || !email || !subject || !message) {
      return {
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Please complete all contact fields.',
      };
    }

    if (!this.hasDatabase()) {
      return {
        ok: true,
        data: {
          ticketId: `TKT-${Date.now()}`,
          message: 'Contact request received successfully.',
        },
      };
    }

    const repository = this.dataSource!.getRepository(ContactTicketEntity);
    const ticket = repository.create({
      name,
      email,
      subject,
      message,
      status: 'new',
    });
    await repository.save(ticket);

    return {
      ok: true,
      data: {
        ticketId: `TKT-${ticket.id}`,
        message: 'Contact request received successfully.',
      },
    };
  }

  async listAdminJobs() {
    this.ensureDatabase();
    const jobRepository = this.dataSource!.getRepository(JobEntity);
    const applicationRepository =
      this.dataSource!.getRepository(ApplicationEntity);

    const jobs = await jobRepository.find({ order: { createdAt: 'DESC' } });

    return await Promise.all(
      jobs.map(async (job) => {
        const applications = await applicationRepository.count({
          where: { jobId: job.id },
        });
        return {
          id: job.id,
          title: job.title,
          company: job.companyName || 'Unknown Company',
          location: job.location,
          status: toTitleCase(job.status || 'draft'),
          applications,
          posted: this.toDateOnly(job.publishedAt ?? job.createdAt),
          type: job.employmentType,
          salary: job.salaryText || null,
          description: job.description,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
          application: job.applicationMethod,
        };
      }),
    );
  }

  async createAdminJob(input: Record<string, unknown>) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(JobEntity);

    const title = this.asString(input.title) || 'Untitled Job';
    const company = this.asString(input.company) || 'Unknown Company';
    const location = this.asString(input.location) || 'Taipei';

    const entity = repository.create({
      title,
      slug: this.uniqueSlug(title),
      companyName: company,
      location,
      employmentType: this.asString(input.type) || 'Full-time',
      salaryText: this.asString(input.salary),
      description: sanitizeRichText(this.asString(input.description)),
      requirements: sanitizeRichText(this.asString(input.requirements)),
      responsibilities: sanitizeRichText(this.asString(input.responsibilities)),
      applicationMethod: this.asString(input.application),
      status: (this.asString(input.status) || 'active').toLowerCase(),
      publishedAt: new Date(),
    });

    const saved = await repository.save(entity);
    return {
      id: saved.id,
      title: saved.title,
      company: saved.companyName,
      location: saved.location,
      status: toTitleCase(saved.status),
      applications: 0,
      posted: this.toDateOnly(saved.publishedAt ?? saved.createdAt),
      type: saved.employmentType,
      salary: saved.salaryText,
      description: saved.description,
      requirements: saved.requirements,
      responsibilities: saved.responsibilities,
      application: saved.applicationMethod,
    };
  }

  async updateAdminJob(id: string, input: Record<string, unknown>) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(JobEntity);
    const entity = await repository.findOne({ where: { id } });

    if (!entity) {
      return null;
    }

    if (this.asString(input.title)) entity.title = this.asString(input.title)!;
    if (this.asString(input.company))
      entity.companyName = this.asString(input.company)!;
    if (this.asString(input.location))
      entity.location = this.asString(input.location)!;
    if (this.asString(input.type))
      entity.employmentType = this.asString(input.type)!;
    if (this.asString(input.salary) !== undefined)
      entity.salaryText = this.asString(input.salary);
    if (this.asString(input.description) !== undefined)
      entity.description = sanitizeRichText(this.asString(input.description));
    if (this.asString(input.requirements) !== undefined)
      entity.requirements = sanitizeRichText(this.asString(input.requirements));
    if (this.asString(input.responsibilities) !== undefined)
      entity.responsibilities = sanitizeRichText(
        this.asString(input.responsibilities),
      );
    if (this.asString(input.application) !== undefined)
      entity.applicationMethod = this.asString(input.application);
    if (this.asString(input.status))
      entity.status = this.asString(input.status)!.toLowerCase();

    await repository.save(entity);

    const applicationRepository =
      this.dataSource!.getRepository(ApplicationEntity);
    const applications = await applicationRepository.count({
      where: { jobId: entity.id },
    });

    return {
      id: entity.id,
      title: entity.title,
      company: entity.companyName,
      location: entity.location,
      status: toTitleCase(entity.status),
      applications,
      posted: this.toDateOnly(entity.publishedAt ?? entity.createdAt),
      type: entity.employmentType,
      salary: entity.salaryText,
      description: entity.description,
      requirements: entity.requirements,
      responsibilities: entity.responsibilities,
      application: entity.applicationMethod,
    };
  }

  async deleteAdminJob(id: string) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(JobEntity);
    await repository.delete({ id });
    return { deleted: true as const };
  }

  async listAdminApplications() {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(ApplicationEntity);

    const list = await repository.find({
      relations: ['candidate', 'job'],
      order: { createdAt: 'DESC' },
    });

    return list.map((item) => ({
      id: item.id,
      candidate: item.candidate?.fullName || 'Unknown Candidate',
      job: item.job?.title || 'Unknown Job',
      status: toTitleCase(item.status),
      appliedDate: this.toDateOnly(item.appliedAt),
      score: item.score,
    }));
  }

  async updateAdminApplicationStatus(id: string, status: string) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(ApplicationEntity);
    const item = await repository.findOne({
      where: { id },
      relations: ['candidate', 'job'],
    });

    if (!item) return null;

    item.status = status.toLowerCase();
    await repository.save(item);

    return {
      id: item.id,
      candidate: item.candidate?.fullName || 'Unknown Candidate',
      job: item.job?.title || 'Unknown Job',
      status: toTitleCase(item.status),
      appliedDate: this.toDateOnly(item.appliedAt),
      score: item.score,
    };
  }

  async deleteAdminApplication(id: string) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(ApplicationEntity);
    await repository.delete({ id });
    return { deleted: true as const };
  }

  async listAdminUsers() {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(UserEntity);

    const users = await repository.find({ order: { createdAt: 'DESC' } });
    return users.map((item) => ({
      id: item.id,
      name: item.fullName,
      email: item.email,
      phone: item.phoneNumber || '',
      role: item.role,
      status: item.status,
      verified: item.isVerified,
      joinedAt: this.toDateOnly(item.createdAt),
    }));
  }

  async createAdminUser(input: Record<string, unknown>) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(UserEntity);

    const name = this.asString(input.name) || 'New User';
    const email = (this.asString(input.email) || '').toLowerCase();

    const existed = await repository.findOne({ where: { email } });
    if (existed) {
      return {
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email is already in use.',
        },
      };
    }

    const entity = repository.create({
      fullName: name,
      email,
      passwordHash: this.asString(input.password) || 'TEMP_HASH',
      phoneNumber: this.asString(input.phone),
      role: this.asString(input.role) || 'editor',
      status: this.asString(input.status) || 'active',
      isVerified: Boolean(input.verified),
      isActive: true,
    });

    const saved = await repository.save(entity);
    return {
      id: saved.id,
      name: saved.fullName,
      email: saved.email,
      phone: saved.phoneNumber || '',
      role: saved.role,
      status: saved.status,
      verified: saved.isVerified,
      joinedAt: this.toDateOnly(saved.createdAt),
    };
  }

  async updateAdminUser(id: string, input: Record<string, unknown>) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(UserEntity);
    const user = await repository.findOne({ where: { id } });
    if (!user) return null;

    if (this.asString(input.name)) user.fullName = this.asString(input.name)!;
    if (this.asString(input.phone) !== undefined)
      user.phoneNumber = this.asString(input.phone);
    if (this.asString(input.role)) user.role = this.asString(input.role)!;
    if (this.asString(input.status)) user.status = this.asString(input.status)!;
    if (typeof input.verified === 'boolean') user.isVerified = input.verified;

    await repository.save(user);

    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      phone: user.phoneNumber || '',
      role: user.role,
      status: user.status,
      verified: user.isVerified,
      joinedAt: this.toDateOnly(user.createdAt),
    };
  }

  async deleteAdminUser(id: string) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(UserEntity);
    await repository.delete({ id });
    return { deleted: true as const };
  }

  async listAdminMedia() {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(MediaAssetEntity);
    const assets = await repository.find({ order: { createdAt: 'DESC' } });
    return assets.map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      fileUrl: asset.fileUrl,
      storageProvider: asset.storageProvider,
      storageKey: asset.storageKey,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      category: asset.category,
      altText: asset.altText,
      createdAt: asset.createdAt.toISOString(),
    }));
  }

  async createAdminMediaFromUpload(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    input: { category?: string; altText?: string },
  ) {
    this.ensureDatabase();
    if (!this.mediaStorageProvider) {
      throw new Error('Media storage provider is not configured.');
    }

    const validatedImage = validateImageUpload(file, {
      maxBytes: this.readNumberEnv('MEDIA_MAX_FILE_SIZE_BYTES', 5 * 1024 * 1024),
      maxWidth: this.readNumberEnv('MEDIA_MAX_IMAGE_WIDTH', 4096),
      maxHeight: this.readNumberEnv('MEDIA_MAX_IMAGE_HEIGHT', 4096),
      maxMegapixels: this.readNumberEnv('MEDIA_MAX_IMAGE_MEGAPIXELS', 16),
    });

    const stored = await this.mediaStorageProvider.storeFile({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: validatedImage.mimeType,
    });

    const repository = this.dataSource!.getRepository(MediaAssetEntity);

    const entity = repository.create({
      fileName: stored.fileName,
      fileUrl: stored.url,
      storageProvider: stored.provider,
      storageKey: stored.key,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      category: this.asString(input.category) || 'general',
      altText: this.asString(input.altText),
    });

    const saved = await repository.save(entity);
    return {
      id: saved.id,
      fileName: saved.fileName,
      fileUrl: saved.fileUrl,
      storageProvider: saved.storageProvider,
      storageKey: saved.storageKey,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      category: saved.category,
      altText: saved.altText,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  async deleteAdminMedia(id: string) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(MediaAssetEntity);
    const existing = await repository.findOne({ where: { id } });
    if (existing?.storageKey && this.mediaStorageProvider) {
      await this.mediaStorageProvider.deleteFile(existing.storageKey);
    }
    await repository.delete({ id });
    return { deleted: true as const };
  }

  async listAdminReports() {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(ReportEntity);
    const rows = await repository.find({ order: { createdAt: 'DESC' } });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      period: row.period,
      status: toTitleCase(row.status),
      generatedAt: row.generatedAt ? row.generatedAt.toISOString() : null,
    }));
  }

  async createAdminReport(input: Record<string, unknown>) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(ReportEntity);
    const entity = repository.create({
      name: this.asString(input.name) || 'Untitled report',
      period: this.asString(input.period) || 'N/A',
      status: (this.asString(input.status) || 'ready').toLowerCase(),
      payload:
        typeof input.payload === 'object' && input.payload != null
          ? (input.payload as Record<string, unknown>)
          : {},
      generatedAt: new Date(),
    });
    const saved = await repository.save(entity);
    return {
      id: saved.id,
      name: saved.name,
      period: saved.period,
      status: toTitleCase(saved.status),
      generatedAt: saved.generatedAt ? saved.generatedAt.toISOString() : null,
    };
  }

  async updateAdminReport(id: string, input: Record<string, unknown>) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(ReportEntity);
    const report = await repository.findOne({ where: { id } });
    if (!report) return null;

    if (this.asString(input.name)) report.name = this.asString(input.name)!;
    if (this.asString(input.period))
      report.period = this.asString(input.period)!;
    if (this.asString(input.status))
      report.status = this.asString(input.status)!.toLowerCase();

    await repository.save(report);
    return {
      id: report.id,
      name: report.name,
      period: report.period,
      status: toTitleCase(report.status),
      generatedAt: report.generatedAt ? report.generatedAt.toISOString() : null,
    };
  }

  async deleteAdminReport(id: string) {
    this.ensureDatabase();
    const repository = this.dataSource!.getRepository(ReportEntity);
    await repository.delete({ id });
    return { deleted: true as const };
  }

  private hasDatabase() {
    return Boolean(this.dataSource && this.dataSource.isInitialized);
  }

  private ensureDatabase() {
    if (!this.hasDatabase()) {
      throw new Error(
        'Database is not available. Check DATABASE_URL and migrations.',
      );
    }
  }

  private toDateOnly(value: Date) {
    return value.toISOString().split('T')[0];
  }

  private asString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    return value.trim();
  }

  private readNumberEnv(name: string, fallback: number): number {
    const raw = process.env[name];
    if (!raw) {
      return fallback;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private uniqueSlug(title: string) {
    const base = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return `${base}-${Date.now()}`;
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    storedHash: string,
  ): Promise<boolean> {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) {
      return password === storedHash;
    }

    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const hashBuffer = Buffer.from(hash, 'hex');

    if (hashBuffer.length !== derivedKey.length) {
      return false;
    }

    return timingSafeEqual(hashBuffer, derivedKey);
  }

  private buildAuthResponseFromFallbackUser(user: UserRecord) {
    return {
      accessToken: `demo-token-${user.id}-${Date.now()}`,
      expiresInSeconds: 60 * 60 * 24 * 7,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }

  private buildAuthResponseFromDbUser(user: UserEntity) {
    return {
      accessToken: `demo-token-${user.id}-${Date.now()}`,
      expiresInSeconds: 60 * 60 * 24 * 7,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
      },
    };
  }
}
