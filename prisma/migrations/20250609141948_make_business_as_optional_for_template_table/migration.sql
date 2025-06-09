-- DropForeignKey
ALTER TABLE "templates" DROP CONSTRAINT "templates_business_id_fkey";

-- AlterTable
ALTER TABLE "templates" ALTER COLUMN "business_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
