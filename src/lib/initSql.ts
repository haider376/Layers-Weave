// Auto-generated from prisma/schema.prisma (prisma migrate diff --from-empty).
// Applied idempotently by /api/seed to create the schema on a fresh database.
export const INIT_SQL = String.raw`
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "type" TEXT,
    "tier" TEXT,
    "leadStatus" TEXT NOT NULL DEFAULT 'New',
    "outreachStatus" TEXT,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "state" TEXT,
    "region" TEXT,
    "timeZone" TEXT,
    "numberEmployees" INTEGER,
    "lastContacted" TIMESTAMP(3),
    "ownerAssignedAt" TIMESTAMP(3),
    "aiNotes" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT,
    "bdrId" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'Appointment Scheduled',
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "requestType" TEXT,
    "createDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closeDate" TIMESTAMP(3),
    "companyId" TEXT NOT NULL,
    "contactId" TEXT,
    "ownerId" TEXT,
    "bdrId" TEXT,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesMeeting" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Booked',
    "outcome" TEXT,
    "meetingDate" TIMESTAMP(3),
    "bookedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "googleMeetUrl" TEXT,
    "callRecording" TEXT,
    "whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "followUp" BOOLEAN NOT NULL DEFAULT false,
    "moodboardUrl" TEXT,
    "categories" TEXT,
    "notes" TEXT,
    "surgeSqm" BOOLEAN NOT NULL DEFAULT false,
    "dealId" TEXT NOT NULL,
    "aeId" TEXT,
    "bdrId" TEXT,

    CONSTRAINT "SalesMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Bulk',
    "status" TEXT NOT NULL DEFAULT 'In Progress',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "category" TEXT,
    "quoteDocUrl" TEXT,
    "invoiceUrl" TEXT,
    "representativeImage" TEXT,
    "clientCountry" TEXT,
    "orderVideos" BOOLEAN NOT NULL DEFAULT false,
    "dateStarted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sellingPriceTotal" DOUBLE PRECISION,
    "buyingPriceTotal" DOUBLE PRECISION,
    "dealId" TEXT,
    "clientName" TEXT NOT NULL,
    "ownerId" TEXT,
    "collaboratorId" TEXT,
    "raghouseId" TEXT,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "item" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "targetPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "quoteId" TEXT NOT NULL,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkDetail" (
    "id" TEXT NOT NULL,
    "grade" TEXT NOT NULL DEFAULT 'A',
    "whatHowMuch" TEXT,
    "videoRequired" BOOLEAN NOT NULL DEFAULT false,
    "quoteId" TEXT NOT NULL,

    CONSTRAINT "BulkDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandpickDetail" (
    "id" TEXT NOT NULL,
    "moodboardUrl" TEXT,
    "wishlist" TEXT,
    "budget" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'Curating',
    "quoteId" TEXT NOT NULL,

    CONSTRAINT "HandpickDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fulfilment" (
    "id" TEXT NOT NULL,
    "orderStage" TEXT NOT NULL DEFAULT 'Preparing',
    "orderType" TEXT NOT NULL DEFAULT 'Air',
    "consigneeAddress" TEXT,
    "fromCity" TEXT,
    "flightDay" TIMESTAMP(3),
    "shippingPaidByClient" BOOLEAN NOT NULL DEFAULT false,
    "paidPartially" BOOLEAN NOT NULL DEFAULT false,
    "paidFully" BOOLEAN NOT NULL DEFAULT false,
    "purchaseOrderUrl" TEXT,
    "expectedFulfilment" TIMESTAMP(3),
    "estimateWeight" DOUBLE PRECISION,
    "chargeableWeight" DOUBLE PRECISION,
    "bolNumber" TEXT,
    "lastMileCourier" TEXT,
    "deliveredDate" TIMESTAMP(3),
    "notifiedClient" BOOLEAN NOT NULL DEFAULT false,
    "totalUnits" INTEGER NOT NULL DEFAULT 0,
    "destination" TEXT,
    "statusNote" TEXT,
    "awbNo" TEXT,
    "invoiceNo3pl" TEXT,
    "layersOrderId" TEXT,
    "paymentStatus" TEXT,
    "goodsDescription" TEXT,
    "boxesBales" INTEGER,
    "totalChargedAmount" DOUBLE PRECISION,
    "perKgAmount" DOUBLE PRECISION,
    "perKgPkr" DOUBLE PRECISION,
    "lmTid" TEXT,
    "quoteId" TEXT NOT NULL,
    "raghouseId" TEXT,
    "carrierId" TEXT,

    CONSTRAINT "Fulfilment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Raghouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "reliability" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Raghouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT,
    "onTime" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceApproval" (
    "id" TEXT NOT NULL,
    "markup" INTEGER NOT NULL,
    "buyingPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "shippingCost" DOUBLE PRECISION NOT NULL,
    "shippingHike" INTEGER NOT NULL,
    "clientTotal" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "requestedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteId" TEXT,

    CONSTRAINT "PriceApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'note',
    "body" TEXT NOT NULL,
    "actor" TEXT,
    "quoteRef" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "companyId" TEXT,
    "dealId" TEXT,
    "number" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "via" TEXT NOT NULL DEFAULT 'Zoom Phone',
    "connected" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "notes" TEXT,
    "transcript" TEXT,
    "durationSec" INTEGER,
    "agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'To-do',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "ownerId" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcingResponse" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quoteRefs" TEXT NOT NULL,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "availabilityQty" INTEGER NOT NULL DEFAULT 0,
    "buyingPricePerItem" DOUBLE PRECISION,
    "grade" TEXT,
    "mixSpecs" TEXT,
    "salesMessage" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Sourced',
    "raghouseId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourcingResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fromAddr" TEXT NOT NULL,
    "toAddr" TEXT NOT NULL,
    "companyId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountEmail" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cadence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "function" TEXT NOT NULL DEFAULT 'Outbound',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cadence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenceStep" (
    "id" TEXT NOT NULL,
    "cadenceId" TEXT NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'call',
    "subject" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CadenceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenceMembership" (
    "id" TEXT NOT NULL,
    "cadenceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentDay" INTEGER NOT NULL DEFAULT 0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadenceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadenceStepRun" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CadenceStepRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Company_clientId_key" ON "Company"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_dealId_key" ON "Deal"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteId_key" ON "Quote"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "BulkDetail_quoteId_key" ON "BulkDetail"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "HandpickDetail_quoteId_key" ON "HandpickDetail"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Fulfilment_quoteId_key" ON "Fulfilment"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Raghouse_name_key" ON "Raghouse"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_name_key" ON "Carrier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_userId_provider_key" ON "Integration"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "CadenceMembership_cadenceId_contactId_key" ON "CadenceMembership"("cadenceId", "contactId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_bdrId_fkey" FOREIGN KEY ("bdrId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_bdrId_fkey" FOREIGN KEY ("bdrId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesMeeting" ADD CONSTRAINT "SalesMeeting_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesMeeting" ADD CONSTRAINT "SalesMeeting_aeId_fkey" FOREIGN KEY ("aeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesMeeting" ADD CONSTRAINT "SalesMeeting_bdrId_fkey" FOREIGN KEY ("bdrId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_raghouseId_fkey" FOREIGN KEY ("raghouseId") REFERENCES "Raghouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkDetail" ADD CONSTRAINT "BulkDetail_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandpickDetail" ADD CONSTRAINT "HandpickDetail_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfilment" ADD CONSTRAINT "Fulfilment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfilment" ADD CONSTRAINT "Fulfilment_raghouseId_fkey" FOREIGN KEY ("raghouseId") REFERENCES "Raghouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfilment" ADD CONSTRAINT "Fulfilment_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceApproval" ADD CONSTRAINT "PriceApproval_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cadence" ADD CONSTRAINT "Cadence_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceStep" ADD CONSTRAINT "CadenceStep_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "Cadence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceMembership" ADD CONSTRAINT "CadenceMembership_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "Cadence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceMembership" ADD CONSTRAINT "CadenceMembership_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceMembership" ADD CONSTRAINT "CadenceMembership_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceStepRun" ADD CONSTRAINT "CadenceStepRun_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CadenceMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadenceStepRun" ADD CONSTRAINT "CadenceStepRun_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "CadenceStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

`;
