-- AlterTable
ALTER TABLE "users" ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending_email_verification',
ADD COLUMN     "verificationCode" TEXT,
ADD COLUMN     "verification_code_expires_at" TIMESTAMP(3);
