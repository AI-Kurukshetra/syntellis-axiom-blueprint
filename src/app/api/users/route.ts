import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput, validateSearchParams } from "@/lib/validation";
import { organizationUsersQuerySchema, userInviteSchema, userProfileReviewSchema } from "@/features/users/user.schemas";
import { inviteUserToOrganization, listOrganizationUsers, reviewOrganizationUserProfile } from "@/features/users/user.service";

export const GET = withRouteHandler(async (request: Request) => {
  const query = validateSearchParams(organizationUsersQuerySchema, new URL(request.url));
  const directory = await listOrganizationUsers(query.limit);

  return ok(directory);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(userInviteSchema, await request.json());
  const invitation = await inviteUserToOrganization(input);

  return created({
    invitation,
  });
});

export const PATCH = withRouteHandler(async (request: Request) => {
  const input = validateInput(userProfileReviewSchema, await request.json());
  const profile = await reviewOrganizationUserProfile(input);

  return ok({
    profile,
  });
});
