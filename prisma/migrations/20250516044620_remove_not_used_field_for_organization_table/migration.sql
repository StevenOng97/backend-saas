/*
  Warnings:

  - You are about to drop the column `email` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `organizations` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "organizations_email_key";

-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "phone";
