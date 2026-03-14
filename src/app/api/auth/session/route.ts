import { getAccessibleModuleKeys, getAccessibleNavigationItems } from "@/lib/auth/authorization";
import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";

export const GET = withRouteHandler(async () => {
  const currentUser = await requireCurrentUserContext();

  return ok({
    currentUser,
    accessibleModules: getAccessibleModuleKeys(currentUser),
    navigationItems: getAccessibleNavigationItems(currentUser),
  });
});
