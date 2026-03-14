import { ok } from "@/lib/api-response";
import { toCsv } from "@/lib/csv";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateSearchParams } from "@/lib/validation";
import { auditLogQuerySchema } from "@/features/compliance/compliance.schemas";
import { listAuditLogCatalog } from "@/features/compliance/compliance.service";

export const GET = withRouteHandler(async (request: Request) => {
  const url = new URL(request.url);
  const filters = validateSearchParams(auditLogQuerySchema, url);
  const catalog = await listAuditLogCatalog(filters);

  if (url.searchParams.get("format") === "csv") {
    const csv = toCsv(
      ["Created At", "Action", "Entity Type", "Entity Id", "Actor User Id", "Scope", "Facility Id", "Metadata"],
      catalog.logs.map((log) => [
        log.created_at,
        log.action,
        log.entity_type,
        log.entity_id ?? "",
        log.actor_user_id ?? "",
        log.scope_level,
        log.facility_id ?? "",
        JSON.stringify(log.metadata ?? {}),
      ])
    );

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="audit-logs.csv"',
      },
    });
  }

  return ok(catalog);
});
