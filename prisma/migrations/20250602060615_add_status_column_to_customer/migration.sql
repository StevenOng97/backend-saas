-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('REQUEST_SENT', 'REQUEST_WRITTEN', 'NO_REQUEST');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "status" "CustomerStatus" NOT NULL DEFAULT 'NO_REQUEST';
