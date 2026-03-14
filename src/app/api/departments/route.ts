import { created, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput, validateSearchParams } from "@/lib/validation";
import { createDepartment, listDepartments } from "@/features/hierarchy/hierarchy.service";
import { departmentsQuerySchema, departmentSchema } from "@/features/hierarchy/hierarchy.schemas";

export const GET = withRouteHandler(async (request: Request) => {
  const query = validateSearchParams(departmentsQuerySchema, new URL(request.url));
  const response = await listDepartments(query.limit, query.facilityId);

  return ok(response);
});

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(departmentSchema, await request.json());
  const department = await createDepartment(input);

  return created({
    department,
  });
});
