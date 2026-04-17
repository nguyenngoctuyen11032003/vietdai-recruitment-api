# FE-to-DB Schema Mapping (Phase 3)

## Muc tieu
Tai lieu nay map truc tiep cac man hinh FE hien co sang bang CSDL can co de dam bao du, dung va phu hop cho van hanh production.

## Nhom chuc nang da doi chieu
- Admin: `jobs`, `applications`, `users`, `blog`, `media`, `reports`
- Public/Auth: `login`, `signup`, `forgot-password`, `contact`
- Candidate dashboard: notifications, saved jobs, profile/application tracking

## Danh sach bang can co

### 1) `users`
- Nguon UI: `xkld/app/admin/users/page.tsx`, auth pages
- Muc dich: danh tinh + role + trang thai + verify
- Cot chinh: `email`, `password_hash`, `full_name`, `phone_number`, `role`, `status`, `is_verified`, `is_active`, timestamps

### 2) `jobs`
- Nguon UI: `xkld/app/admin/jobs/page.tsx`, `xkld/app/jobs/*`
- Muc dich: job catalog + thong tin hien thi chi tiet
- Cot chinh: `title`, `slug`, `company_name`, `location`, `employment_type`, salary fields, `description`, `requirements`, `responsibilities`, `application_method`, `tags`, `status`, `published_at`, timestamps

### 3) `candidates`
- Nguon UI: `xkld/app/admin/candidates/page.tsx`
- Muc dich: thong tin ung vien quan tri
- Cot chinh: `full_name`, `email`, `phone_number`, `current_title`, `location`, `years_experience`, timestamps

### 4) `applications`
- Nguon UI: `xkld/app/admin/applications/page.tsx`, dashboard
- Muc dich: ho so ung tuyen + trang thai xu ly
- Cot chinh: `job_id`, `candidate_id`, `reviewer_id`, `status`, `score`, `note`, `applied_at`, timestamps

### 5) `blog_posts`
- Nguon UI: `xkld/app/blog/*`, `xkld/app/admin/blog/page.tsx`
- Muc dich: bai viet cong khai + quan tri draft/published
- Cot chinh: `title`, `slug`, `excerpt`, `content`, `author_name`, `cover_image_url`, `status`, `views`, `published_at`, timestamps

### 6) `media_assets`
- Nguon UI: `xkld/app/admin/media/page.tsx`
- Muc dich: kho media cho blog/campaign/thumbnail
- Cot chinh: `file_name`, `file_url`, `mime_type`, `size_bytes`, `category`, `alt_text`, `created_at`

### 7) `reports`
- Nguon UI: `xkld/app/admin/reports/page.tsx`
- Muc dich: metadata report + payload tong hop
- Cot chinh: `name`, `period`, `status`, `payload(jsonb)`, `generated_at`, timestamps

### 8) `contact_tickets`
- Nguon UI: `xkld/app/contact/page.tsx`
- Muc dich: ticket contact tu public form
- Cot chinh: `name`, `email`, `subject`, `message`, `status`, `created_at`

### 9) `saved_jobs`
- Nguon UI: dashboard saved jobs
- Muc dich: danh dau job cua user
- Cot chinh: `user_id`, `job_id`, `created_at`, unique `(user_id, job_id)`

### 10) `notifications`
- Nguon UI: dashboard notifications
- Muc dich: thong bao he thong/recruiter cho user
- Cot chinh: `user_id`, `title`, `detail`, `type`, `is_read`, `read_at`, `created_at`

## Migration phu trach
- Da co migration tong hop: `xkld-be/src/database/migrations/1740000000005-ExpandPlatformSchema.ts`
- Migration nay mo rong `users/jobs/candidates/applications` va tao moi `blog_posts/media_assets/reports/contact_tickets/saved_jobs/notifications`

## Ghi chu van hanh
- Van giu `synchronize: false` (schema chi thay doi qua migration).
- Cac endpoint admin da mo API trong `xkld-be/src/app.controller.ts` cho FE admin jobs/applications/users.
- Cac module admin `blog/media/reports` da co bang CSDL, can tiep tuc hoan thien CRUD endpoint theo cung pattern.

