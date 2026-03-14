import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { assignDepartmentToOrganizationUser, revokeDepartmentAssignment } from "@/features/users/user.service";
import { userDepartmentAssignmentRemovalSchema, userDepartmentAssignmentSchema } from "@/features/users/user.schemas";

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(userDepartmentAssignmentSchema, await request.json());
  const assignment = await assignDepartmentToOrganizationUser(input);

  return created({
    assignment,
  });
});

export const DELETE = withRouteHandler(async (request: Request) => {
  const input = validateInput(userDepartmentAssignmentRemovalSchema, await request.json());
  const assignment = await revokeDepartmentAssignment(input.assignmentId);

  return ok({
    assignment,
    deleted: true,
  });
});
