import { ApplicationEntity } from './application.entity';
import { CandidateEntity } from './candidate.entity';
import { JobEntity } from './job.entity';
import { UserEntity } from './user.entity';

export const databaseEntities = [
  UserEntity,
  JobEntity,
  CandidateEntity,
  ApplicationEntity,
];

export { ApplicationEntity, CandidateEntity, JobEntity, UserEntity };

