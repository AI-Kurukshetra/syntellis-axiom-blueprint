import { ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { authSessionAuditSchema } from "@/features/compliance/compliance.schemas";
import { logAuthSessionEvent } from "@/features/compliance/compliance.service";
import { getAccessibleModuleKeys, getAccessibleNavigationItems } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";

export const GET = withRouteHandler(async () => {
  const currentUser = await requireCurrentUserContext();

  return ok({
    currentUser,
    accessibleModules: getAccessibleModuleKeys(currentUser),
    navigationItems: getAccessibleNavigationItems(currentUser),
  });
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(authSessionAuditSchema, await request.json());
  const result = await logAuthSessionEvent(input);
  return ok(result);
});
