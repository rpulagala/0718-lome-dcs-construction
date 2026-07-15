-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('CUSTOMER', 'STAFF');

-- CreateTable
CREATE TABLE "ClientMessage" (
    "id" TEXT NOT NULL,
    "workRequestId" TEXT NOT NULL,
    "senderType" "MessageSenderType" NOT NULL,
    "authorAccountId" TEXT,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientMessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientMessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientMessage_workRequestId_createdAt_idx" ON "ClientMessage"("workRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientMessage_readAt_idx" ON "ClientMessage"("readAt");

-- CreateIndex
CREATE INDEX "ClientMessageAttachment_messageId_idx" ON "ClientMessageAttachment"("messageId");

-- AddForeignKey
ALTER TABLE "ClientMessage" ADD CONSTRAINT "ClientMessage_workRequestId_fkey" FOREIGN KEY ("workRequestId") REFERENCES "WorkRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMessage" ADD CONSTRAINT "ClientMessage_authorAccountId_fkey" FOREIGN KEY ("authorAccountId") REFERENCES "CustomerAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMessage" ADD CONSTRAINT "ClientMessage_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientMessageAttachment" ADD CONSTRAINT "ClientMessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ClientMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
