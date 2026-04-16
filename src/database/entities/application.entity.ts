import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { CandidateEntity } from './candidate.entity';
import { JobEntity } from './job.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'applications' })
@Unique('uq_applications_job_candidate', ['jobId', 'candidateId'])
export class ApplicationEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'job_id', type: 'bigint' })
  jobId!: string;

  @Column({ name: 'candidate_id', type: 'bigint' })
  candidateId!: string;

  @Column({ name: 'reviewer_id', type: 'bigint', nullable: true })
  reviewerId!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'submitted' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'applied_at', type: 'timestamptz', default: () => 'now()' })
  appliedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => JobEntity, (job) => job.applications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'job_id' })
  job!: JobEntity;

  @ManyToOne(() => CandidateEntity, (candidate) => candidate.applications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: CandidateEntity;

  @ManyToOne(() => UserEntity, (user) => user.reviewedApplications, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: UserEntity | null;
}


