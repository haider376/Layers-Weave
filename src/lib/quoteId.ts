import { prisma } from "./db";

// Quote ID format: LQ- + 5 random digits, unique (check + regenerate on collision).
// This is the supplier-facing identity (spec §2).
export async function generateQuoteId(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const candidate = `LQ-${Math.floor(10000 + Math.random() * 90000)}`;
    const existing = await prisma.quote.findUnique({ where: { quoteId: candidate } });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique Quote ID");
}

export function randomQuoteIdSync(): string {
  return `LQ-${Math.floor(10000 + Math.random() * 90000)}`;
}
