import { ApplicationEntity } from './application.entity';
import { BlogPostEntity } from './blog-post.entity';
import { CandidateEntity } from './candidate.entity';
import { ContactTicketEntity } from './contact-ticket.entity';
import { JobEntity } from './job.entity';
import { MediaAssetEntity } from './media-asset.entity';
import { NotificationEntity } from './notification.entity';
import { PasswordResetTokenEntity } from './password-reset-token.entity';
import { RefreshTokenEntity } from './refresh-token.entity';
import { ReportEntity } from './report.entity';
import { SavedJobEntity } from './saved-job.entity';
import { UserEntity } from './user.entity';

export const databaseEntities = [
  UserEntity,
  JobEntity,
  CandidateEntity,
  ApplicationEntity,
  BlogPostEntity,
  MediaAssetEntity,
  ReportEntity,
  ContactTicketEntity,
  SavedJobEntity,
  NotificationEntity,
  PasswordResetTokenEntity,
  RefreshTokenEntity,
];

export {
  ApplicationEntity,
  BlogPostEntity,
  CandidateEntity,
  ContactTicketEntity,
  JobEntity,
  MediaAssetEntity,
  NotificationEntity,
  PasswordResetTokenEntity,
  RefreshTokenEntity,
  ReportEntity,
  SavedJobEntity,
  UserEntity,
};
