-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "google_location_id" TEXT,
ADD COLUMN     "google_place_id" TEXT,
ADD COLUMN     "last_review_check" TIMESTAMP(3);
