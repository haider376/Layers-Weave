import { prisma } from "@/lib/db";

// Self-healing schema guard for the Cadence + AppSetting tables.
//
// On some deploys `prisma db push` is skipped/fails and /api/seed is never
// called manually, so these newer tables don't exist yet — which made
// "Create cadence" fail silently. Running the idempotent DDL below on first
// use makes the feature work regardless of deploy state. All statements use
// IF NOT EXISTS (or are wrapped) so they're safe to run repeatedly.

const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
  )`,
  `CREATE TABLE IF NOT EXISTS "Integration" (
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
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Integration_userId_provider_key" ON "Integration"("userId", "provider")`,
  `CREATE TABLE IF NOT EXISTS "Cadence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "function" TEXT NOT NULL DEFAULT 'Outbound',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cadence_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "CadenceStep" (
    "id" TEXT NOT NULL,
    "cadenceId" TEXT NOT NULL,
    "day" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'call',
    "subject" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CadenceStep_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "CadenceMembership" (
    "id" TEXT NOT NULL,
    "cadenceId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentDay" INTEGER NOT NULL DEFAULT 0,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CadenceMembership_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "CadenceStepRun" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "CadenceStepRun_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CadenceMembership_cadenceId_contactId_key" ON "CadenceMembership"("cadenceId", "contactId")`,
  `CREATE TABLE IF NOT EXISTS "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "waMessageId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "body" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "toNumber" TEXT NOT NULL,
    "status" TEXT,
    "companyId" TEXT,
    "contactId" TEXT,
    "dealId" TEXT,
    "agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppMessage_waMessageId_key" ON "WhatsAppMessage"("waMessageId")`,
];

// Foreign keys are added separately and ignored if they already exist (no
// IF NOT EXISTS for constraints in Postgres < 9.6-compatible syntax).
const FKS: string[] = [
  `ALTER TABLE "Cadence" ADD CONSTRAINT "Cadence_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "CadenceStep" ADD CONSTRAINT "CadenceStep_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "Cadence"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "CadenceMembership" ADD CONSTRAINT "CadenceMembership_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "Cadence"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "CadenceMembership" ADD CONSTRAINT "CadenceMembership_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "CadenceMembership" ADD CONSTRAINT "CadenceMembership_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
  `ALTER TABLE "CadenceStepRun" ADD CONSTRAINT "CadenceStepRun_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CadenceMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "CadenceStepRun" ADD CONSTRAINT "CadenceStepRun_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "CadenceStep"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
];

let healed = false;

// Returns true if a missing-relation (42P01) error indicates we should heal.
export function isMissingTable(e: unknown): boolean {
  const code = (e as { code?: string })?.code;
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return code === "42P01" || msg.includes("does not exist") || msg.includes("relation") && msg.includes("cadence");
}

// Columns added to pre-existing tables after their initial migration.
const COLUMN_PATCHES: string[] = [
  `ALTER TABLE "CallLog" ADD COLUMN IF NOT EXISTS "recordingUrl" TEXT`,
  `ALTER TABLE "CallLog" ADD COLUMN IF NOT EXISTS "zoomCallId" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "CallLog_zoomCallId_key" ON "CallLog"("zoomCallId")`,
];

export async function ensureCadenceSchema(): Promise<void> {
  // Column patches are cheap + idempotent (IF NOT EXISTS) — always run them so a
  // stale in-memory `healed` flag can't skip a needed column add.
  for (const patch of COLUMN_PATCHES) {
    try { await prisma.$executeRawUnsafe(patch); } catch { /* already applied */ }
  }
  if (healed) return;
  for (const stmt of DDL) {
    try { await prisma.$executeRawUnsafe(stmt); } catch { /* best-effort, idempotent */ }
  }
  for (const fk of FKS) {
    try { await prisma.$executeRawUnsafe(fk); } catch { /* already exists */ }
  }
  healed = true;
}
