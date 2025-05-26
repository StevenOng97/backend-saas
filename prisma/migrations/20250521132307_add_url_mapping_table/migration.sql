-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "a2p_brand_id" TEXT,
ADD COLUMN     "a2p_campaign_id" TEXT,
ADD COLUMN     "email_template" TEXT,
ADD COLUMN     "sender_phone" TEXT,
ADD COLUMN     "sender_type" TEXT NOT NULL DEFAULT 'shared',
ADD COLUMN     "sms_template" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "opted_out" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "invites" ADD COLUMN     "device_info" TEXT,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "opened_at" TIMESTAMP(3),
ADD COLUMN     "rating_value" INTEGER;

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "invite_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_mappings" (
    "id" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "short_url" TEXT NOT NULL,
    "url_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "url_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_invite_id_key" ON "feedback"("invite_id");

-- CreateIndex
CREATE UNIQUE INDEX "url_mappings_url_id_key" ON "url_mappings"("url_id");

-- CreateIndex
CREATE INDEX "url_mappings_url_id_idx" ON "url_mappings"("url_id");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "invites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
