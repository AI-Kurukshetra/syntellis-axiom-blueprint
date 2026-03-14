import { z } from "@/lib/validation";

export const adminOverviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(8),
});
