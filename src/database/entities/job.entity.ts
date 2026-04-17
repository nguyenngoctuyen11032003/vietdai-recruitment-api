import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApplicationEntity } from './application.entity';

@Entity({ name: 'jobs' })
@Check(
  '"salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max"',
)
export class JobEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({
    name: 'company_name',
    type: 'varchar',
    length: 180,
    default: '',
  })
  companyName!: string;

  @Column({ type: 'varchar', length: 220, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 120 })
  location!: string;

  @Column({
    name: 'employment_type',
    type: 'varchar',
    length: 40,
    default: 'Full-time',
  })
  employmentType!: string;

  @Column({ name: 'salary_min', type: 'integer', nullable: true })
  salaryMin!: number | null;

  @Column({ name: 'salary_max', type: 'integer', nullable: true })
  salaryMax!: number | null;

  @Column({ type: 'char', length: 3, default: 'VND' })
  currency!: string;

  @Column({
    name: 'salary_text',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  salaryText!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'text', nullable: true })
  responsibilities!: string | null;

  @Column({ type: 'text', nullable: true })
  requirements!: string | null;

  @Column({
    name: 'application_method',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  applicationMethod!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;
  @OneToMany(() => ApplicationEntity, (application) => application.job)
  applications!: ApplicationEntity[];
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
