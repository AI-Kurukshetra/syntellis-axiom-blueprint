import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { assignFacilityToOrganizationUser, revokeFacilityAssignment } from "@/features/users/user.service";
import { userFacilityAssignmentRemovalSchema, userFacilityAssignmentSchema } from "@/features/users/user.schemas";

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(userFacilityAssignmentSchema, await request.json());
  const assignment = await assignFacilityToOrganizationUser(input);

  return created({
    assignment,
  });
});

export const DELETE = withRouteHandler(async (request: Request) => {
  const input = validateInput(userFacilityAssignmentRemovalSchema, await request.json());
  const assignment = await revokeFacilityAssignment(input.assignmentId);

  return ok({
    assignment,
    deleted: true,
  });
});
