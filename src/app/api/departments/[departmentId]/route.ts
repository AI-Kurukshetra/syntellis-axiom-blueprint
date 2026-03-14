import { notFound, ok } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { deleteDepartment, getDepartment, updateDepartment } from "@/features/hierarchy/hierarchy.service";
import { departmentUpdateSchema } from "@/features/hierarchy/hierarchy.schemas";

type DepartmentRouteContext = {
  params: Promise<{
    departmentId: string;
  }>;
};

export const GET = withRouteHandler(async (_request: Request, context: DepartmentRouteContext) => {
  const { departmentId } = await context.params;
  const department = await getDepartment(departmentId);

  return ok({
    department,
  });
});

export const PATCH = withRouteHandler(async (request: Request, context: DepartmentRouteContext) => {
  const { departmentId } = await context.params;
  const input = validateInput(departmentUpdateSchema, await request.json());
  const department = await updateDepartment(departmentId, input);

  return ok({
    department,
  });
});

export const DELETE = withRouteHandler(async (_request: Request, context: DepartmentRouteContext) => {
  const { departmentId } = await context.params;

  if (!departmentId) {
    return notFound("Department id is required.");
  }

  await deleteDepartment(departmentId);

  return ok({
    deleted: true,
  });
});
