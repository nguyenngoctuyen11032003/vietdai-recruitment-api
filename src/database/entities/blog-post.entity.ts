import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'blog_posts' })
export class BlogPostEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 220 })
  title!: string;

  @Column({ type: 'varchar', length: 240, unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  excerpt!: string | null;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @Column({ name: 'author_name', type: 'varchar', length: 140, default: 'XKLD Team' })
  authorName!: string;

  @Column({ name: 'cover_image_url', type: 'varchar', length: 255, nullable: true })
  coverImageUrl!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ type: 'integer', default: 0 })
  views!: number;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

