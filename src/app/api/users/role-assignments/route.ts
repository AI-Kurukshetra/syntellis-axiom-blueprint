import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { assignRoleToOrganizationUser, revokeRoleAssignment } from "@/features/users/user.service";
import { userRoleAssignmentRemovalSchema, userRoleAssignmentSchema } from "@/features/users/user.schemas";

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(userRoleAssignmentSchema, await request.json());
  const assignment = await assignRoleToOrganizationUser(input);

  return created({
    assignment,
  });
});

export const DELETE = withRouteHandler(async (request: Request) => {
  const input = validateInput(userRoleAssignmentRemovalSchema, await request.json());
  const assignment = await revokeRoleAssignment(input.assignmentId);

  return ok({
    assignment,
    deleted: true,
  });
});
