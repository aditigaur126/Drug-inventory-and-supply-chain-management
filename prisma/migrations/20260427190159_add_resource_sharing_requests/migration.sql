-- AlterTable
ALTER TABLE "ResourceSharing" ADD COLUMN     "item_id" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_hospital_id" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';
