/*
  Warnings:

  - You are about to drop the column `invite_id` on the `feedback` table. All the data in the column will be lost.
  - You are about to drop the column `rating_value` on the `invites` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[rating_id]` on the table `feedback` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rating_id` to the `feedback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_invite_id_fkey";

-- DropIndex
DROP INDEX "feedback_invite_id_key";

-- AlterTable
ALTER TABLE "feedback" DROP COLUMN "invite_id",
ADD COLUMN     "rating_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "invites" DROP COLUMN "rating_value";

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "invite_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ratings_invite_id_key" ON "ratings"("invite_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedback_rating_id_key" ON "feedback"("rating_id");

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "invites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_rating_id_fkey" FOREIGN KEY ("rating_id") REFERENCES "ratings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
