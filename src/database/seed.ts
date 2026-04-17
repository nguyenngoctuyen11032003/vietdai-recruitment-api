import 'dotenv/config';
import { randomBytes, scrypt as scryptCallback } from 'crypto';
import { promisify } from 'util';
import dataSource from './typeorm.datasource';
import {
  ApplicationEntity,
  BlogPostEntity,
  CandidateEntity,
  ContactTicketEntity,
  JobEntity,
  MediaAssetEntity,
  NotificationEntity,
  PasswordResetTokenEntity,
  ReportEntity,
  SavedJobEntity,
  UserEntity,
} from './entities';

const scrypt = promisify(scryptCallback);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function seed() {
  await dataSource.initialize();

  try {
    const userRepository = dataSource.getRepository(UserEntity);
    const jobRepository = dataSource.getRepository(JobEntity);
    const candidateRepository = dataSource.getRepository(CandidateEntity);
    const applicationRepository = dataSource.getRepository(ApplicationEntity);
    const blogRepository = dataSource.getRepository(BlogPostEntity);
    const mediaRepository = dataSource.getRepository(MediaAssetEntity);
    const reportRepository = dataSource.getRepository(ReportEntity);
    const contactRepository = dataSource.getRepository(ContactTicketEntity);
    const savedJobRepository = dataSource.getRepository(SavedJobEntity);
    const notificationRepository = dataSource.getRepository(NotificationEntity);
    const resetTokenRepository = dataSource.getRepository(PasswordResetTokenEntity);

    const adminPasswordHash = await hashPassword('123123Ab');
    const demoPasswordHash = await hashPassword('Demo@1234');

    await userRepository.upsert(
      [
        {
          email: 'tt98tuyen@gmail.com',
          passwordHash: adminPasswordHash,
          fullName: 'Tran Tuyen',
          role: 'admin',
          status: 'active',
          isVerified: true,
          isActive: true,
          phoneNumber: '0900000001',
        },
        {
          email: 'demo@xkld.vn',
          passwordHash: demoPasswordHash,
          fullName: 'Demo User',
          role: 'editor',
          status: 'active',
          isVerified: true,
          isActive: true,
          phoneNumber: '0900000002',
        },
      ],
      ['email'],
    );

    const adminUser = await userRepository.findOneOrFail({
      where: { email: 'tt98tuyen@gmail.com' },
    });

    await jobRepository.upsert(
      [
        {
          title: 'Assembly Line Operator',
          slug: 'assembly-line-operator-seed',
          companyName: 'Taipei Precision Co., Ltd',
          location: 'Taipei',
          employmentType: 'Full-time',
          salaryMin: 28000,
          salaryMax: 38000,
          salaryText: '28,000 - 38,000 TWD/month',
          currency: 'TWD',
          status: 'active',
          description: '<p>Stable factory role with overtime opportunities.</p>',
          responsibilities: '<ul><li>Operate production line tools</li></ul>',
          requirements: '<ul><li>Basic technical understanding</li></ul>',
          applicationMethod: 'hr@taipei-precision.example',
          tags: ['factory', 'taipei'],
          publishedAt: new Date(),
        },
      ],
      ['slug'],
    );

    const job = await jobRepository.findOneOrFail({
      where: { slug: 'assembly-line-operator-seed' },
    });

    await candidateRepository.upsert(
      [
        {
          fullName: 'Nguyen Van Candidate',
          email: 'candidate1@example.com',
          phoneNumber: '0911002200',
          currentTitle: 'Production Worker',
          location: 'Ho Chi Minh City',
          yearsExperience: '2 years',
        },
      ],
      ['email'],
    );

    const candidate = await candidateRepository.findOneOrFail({
      where: { email: 'candidate1@example.com' },
    });

    await applicationRepository.upsert(
      [
        {
          jobId: job.id,
          candidateId: candidate.id,
          reviewerId: adminUser.id,
          status: 'reviewing',
          score: 82,
          note: 'Strong communication, good attendance record.',
          appliedAt: new Date(),
        },
      ],
      ['jobId', 'candidateId'],
    );

    await blogRepository.upsert(
      [
        {
          title: 'How to Prepare for Taiwan Factory Interviews',
          slug: 'taiwan-factory-interview-prep-seed',
          excerpt: 'A practical checklist before your interview day.',
          content:
            '<p>Practice short introductions and review factory safety basics.</p>',
          authorName: 'XKLD Team',
          coverImageUrl: 'https://images.example.com/blog/interview-guide.jpg',
          status: 'published',
          views: 120,
          publishedAt: new Date(),
        },
      ],
      ['slug'],
    );

    const mediaExists = await mediaRepository.findOne({
      where: { fileUrl: 'https://images.example.com/media/hero-banner.jpg' },
    });
    if (!mediaExists) {
      await mediaRepository.save(
        mediaRepository.create({
          fileName: 'hero-banner.jpg',
          fileUrl: 'https://images.example.com/media/hero-banner.jpg',
          storageProvider: 'seed',
          storageKey: 'seed/hero-banner.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: String(256000),
          category: 'campaign',
          altText: 'Factory workers in Taiwan',
        }),
      );
    }

    const reportExists = await reportRepository.findOne({
      where: { name: 'Monthly Hiring Overview', period: '2026-04' },
    });
    if (!reportExists) {
      await reportRepository.save(
        reportRepository.create({
          name: 'Monthly Hiring Overview',
          period: '2026-04',
          status: 'ready',
          payload: {
            jobs: 1,
            candidates: 1,
            applications: 1,
          },
          generatedAt: new Date(),
        }),
      );
    }

    const contactExists = await contactRepository.findOne({
      where: {
        email: 'candidate1@example.com',
        subject: 'Need guidance on visa process',
      },
    });
    if (!contactExists) {
      await contactRepository.save(
        contactRepository.create({
          name: 'Nguyen Van Candidate',
          email: 'candidate1@example.com',
          subject: 'Need guidance on visa process',
          message: 'Please share the timeline and required documents.',
          status: 'new',
        }),
      );
    }

    await savedJobRepository.upsert(
      [
        {
          userId: adminUser.id,
          jobId: job.id,
        },
      ],
      ['userId', 'jobId'],
    );

    const notificationExists = await notificationRepository.findOne({
      where: {
        userId: adminUser.id,
        title: 'Application requires review',
      },
    });
    if (!notificationExists) {
      await notificationRepository.save(
        notificationRepository.create({
          userId: adminUser.id,
          title: 'Application requires review',
          detail: 'A new candidate submitted an application for review.',
          type: 'system',
          isRead: false,
          readAt: null,
        }),
      );
    }

    const resetTokenExists = await resetTokenRepository.findOne({
      where: { userId: adminUser.id },
      order: { createdAt: 'DESC' },
    });
    if (!resetTokenExists) {
      const tokenHash = await hashPassword(`seed-${Date.now()}`);
      await resetTokenRepository.save(
        resetTokenRepository.create({
          userId: adminUser.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 1000 * 60 * 30),
          usedAt: null,
        }),
      );
    }

    console.log('Database seeding completed successfully.');
  } finally {
    await dataSource.destroy();
  }
}

void seed().catch((error: unknown) => {
  console.error('Database seeding failed:', error);
  process.exitCode = 1;
});

