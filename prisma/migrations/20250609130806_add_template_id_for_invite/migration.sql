-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "template_id" TEXT;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
