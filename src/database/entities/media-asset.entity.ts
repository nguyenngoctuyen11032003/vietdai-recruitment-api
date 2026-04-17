import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'media_assets' })
export class MediaAssetEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_url', type: 'varchar', length: 255 })
  fileUrl!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 120 })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'bigint', default: 0 })
  sizeBytes!: string;

  @Column({ type: 'varchar', length: 60, default: 'general' })
  category!: string;

  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  altText!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

