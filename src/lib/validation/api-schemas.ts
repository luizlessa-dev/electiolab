import { z } from "zod";

/**
 * Schemas de validação para rotas de API críticas.
 * Reutilize em todas as rotas que aceitam input.
 */

// Revalidate route
export const RevalidateQuerySchema = z.object({
  path: z.string().min(1, "Path é obrigatório"),
  token: z.string().optional(),
});

// Health check parameters
export const HealthCheckParamsSchema = z.object({
  agent: z.enum(["agent-1-tse", "agent-2-institutos", "agent-3-validacao"]).optional(),
});

// Admin discrepancies filter
export const DiscrepancyFilterSchema = z.object({
  state: z.string().length(2).optional().nullable(),
  position: z.enum(["governador", "senador", "presidencial"]).optional().nullable(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional().nullable(),
  status: z.enum(["open", "resolved", "ignored"]).optional().nullable(),
  type: z.string().optional().nullable(),
  search: z.string().optional().nullable(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Poll ingestion
export const PollIngestionSchema = z.object({
  institute_name: z.string().min(1),
  publication_date: z.string().datetime(),
  election_id: z.number().int().positive(),
  methodology: z.string().optional(),
  sample_size: z.number().int().positive().optional(),
  margin_of_error: z.number().positive().optional(),
  poll_results: z.array(
    z.object({
      candidate_id: z.number().int().positive().optional(),
      name: z.string().min(1),
      intention: z.number().min(0).max(100),
      trend: z.enum(["up", "down", "stable"]).optional(),
    })
  ),
});

// Stripe webhook
export const StripeWebhookSchema = z.object({
  type: z.string(),
  data: z.record(z.unknown()),
  id: z.string(),
});

// TSE sync parameters
export const TseSyncParamsSchema = z.object({
  position: z.enum(["governador", "senador", "presidencial"]).default("governador"),
  state: z.string().length(2).optional(),
  detailed: z.enum(["true", "false"]).transform((v) => v === "true").default(false),
});
