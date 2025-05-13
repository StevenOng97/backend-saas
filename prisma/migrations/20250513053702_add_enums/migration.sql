/*
  Warnings:

  - The `status` column on the `invites` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `sms_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `plan` column on the `subscriptions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'BUSINESS_OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SmsStatus" AS ENUM ('QUEUED', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PRO');

-- AlterTable
ALTER TABLE "invites" DROP COLUMN "status",
ADD COLUMN     "status" "InviteStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "sms_logs" DROP COLUMN "status",
ADD COLUMN     "status" "SmsStatus" NOT NULL DEFAULT 'QUEUED';

-- AlterTable
ALTER TABLE "subscriptions" DROP COLUMN "plan",
ADD COLUMN     "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'STAFF';
