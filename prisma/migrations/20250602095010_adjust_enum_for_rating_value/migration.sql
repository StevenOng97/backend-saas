/*
  Warnings:

  - Changed the type of `value` on the `ratings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RatingValue" AS ENUM ('THUMBS_UP', 'THUMBS_DOWN');

-- AlterTable
ALTER TABLE "ratings" DROP COLUMN "value",
ADD COLUMN     "value" "RatingValue" NOT NULL;
