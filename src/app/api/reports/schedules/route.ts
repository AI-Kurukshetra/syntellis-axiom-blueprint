import { created } from "@/lib/api-response";
import { withRouteHandler } from "@/lib/route-helpers";
import { validateInput } from "@/lib/validation";
import { createReportSchedule, deleteReportSchedule } from "@/features/reports/report.service";
import { reportScheduleRemovalSchema, reportScheduleSchema } from "@/features/reports/report.schemas";

export const POST = withRouteHandler(async (request: Request) => {
  const input = validateInput(reportScheduleSchema, await request.json());
  const schedule = await createReportSchedule(input);
  return created(schedule);
});

export const DELETE = withRouteHandler(async (request: Request) => {
  const url = new URL(request.url);
  const input = validateInput(reportScheduleRemovalSchema, { scheduleId: url.searchParams.get("scheduleId") });
  const schedule = await deleteReportSchedule(input.scheduleId);
  return created(schedule);
});
