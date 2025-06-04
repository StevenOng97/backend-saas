/*
  Warnings:

  - A unique constraint covering the columns `[short_id]` on the table `invites` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "short_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invites_short_id_key" ON "invites"("short_id");
