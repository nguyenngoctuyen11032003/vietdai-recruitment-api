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
@Check('"salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max"')
export class JobEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 180 })
  title!: string;

  @Column({ type: 'varchar', length: 220, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 120 })
  location!: string;

  @Column({ type: 'integer', nullable: true })
  salaryMin!: number | null;

  @Column({ type: 'integer', nullable: true })
  salaryMax!: number | null;

  @Column({ type: 'char', length: 3, default: 'VND' })
  currency!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ApplicationEntity, (application) => application.job)
  applications!: ApplicationEntity[];
}

