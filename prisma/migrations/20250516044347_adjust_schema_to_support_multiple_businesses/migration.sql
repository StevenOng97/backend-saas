/*
  Warnings:

  - You are about to drop the column `business_id` on the `subscriptions` table. All the data in the column will be lost.
  - You are about to drop the column `business_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organization_id,email]` on the table `businesses` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organization_id]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `organization_id` to the `businesses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `invites` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `subscriptions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organization_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_business_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_business_id_fkey";

-- DropIndex
DROP INDEX "businesses_email_key";

-- DropIndex
DROP INDEX "subscriptions_business_id_key";

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "is_main_location" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organization_id" TEXT NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "organization_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "business_id",
ADD COLUMN     "organization_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "business_id",
ADD COLUMN     "organization_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_email_key" ON "organizations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "businesses_organization_id_email_key" ON "businesses"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organization_id_key" ON "subscriptions"("organization_id");

-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
