"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createReport,
  createReportSchedule,
  deleteReport,
  deleteReportSchedule,
  runReport,
  updateReport,
} from "@/features/reports/report.service";
import {
  reportRemovalSchema,
  reportRunSchema,
  reportScheduleRemovalSchema,
  reportScheduleSchema,
  reportSchema,
  reportUpdateSchema,
} from "@/features/reports/report.schemas";
import { executeValidatedServerAction } from "@/lib/server-action";

function redirectReportError(message: string, reportSlug?: string): never {
  const query = new URLSearchParams({ error: message });
  if (reportSlug) {
    query.set("reportSlug", reportSlug);
  }
  redirect(`/reports?${query.toString()}`);
}

function redirectReportSuccess(message: string, reportSlug?: string): never {
  const query = new URLSearchParams({ message });
  if (reportSlug) {
    query.set("reportSlug", reportSlug);
  }
  revalidatePath("/reports");
  redirect(`/reports?${query.toString()}`);
}

function getStringArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => String(value))
    .filter(Boolean);
}

function getReportInputFromFormData(formData: FormData) {
  return {
    ...Object.fromEntries(formData.entries()),
    metricIds: getStringArray(formData, "metricIds"),
    columns: getStringArray(formData, "columns"),
  };
}

function getReportScheduleInputFromFormData(formData: FormData) {
  return {
    ...Object.fromEntries(formData.entries()),
    recipientUserIds: getStringArray(formData, "recipientUserIds"),
    deliveryChannels: getStringArray(formData, "deliveryChannels"),
  };
}

export async function createReportAction(formData: FormData) {
  const result = await executeValidatedServerAction(reportSchema, getReportInputFromFormData(formData), (input) => createReport(input));

  if (!result.success) {
    redirectReportError(result.error.message);
  }

  redirectReportSuccess(`Report ${result.data.name} created.`, result.data.slug);
}

export async function updateReportAction(formData: FormData) {
  const result = await executeValidatedServerAction(reportUpdateSchema, getReportInputFromFormData(formData), (input) =>
    updateReport(input.reportId, input)
  );

  if (!result.success) {
    redirectReportError(result.error.message, String(formData.get("reportSlug") ?? ""));
  }

  redirectReportSuccess(`Report ${result.data.name} updated.`, result.data.slug);
}

export async function deleteReportAction(formData: FormData) {
  const result = await executeValidatedServerAction(reportRemovalSchema, Object.fromEntries(formData.entries()), (input) => deleteReport(input.reportId));

  if (!result.success) {
    redirectReportError(result.error.message, String(formData.get("reportSlug") ?? ""));
  }

  redirectReportSuccess("Report removed.");
}

export async function createReportScheduleAction(formData: FormData) {
  const result = await executeValidatedServerAction(reportScheduleSchema, getReportScheduleInputFromFormData(formData), (input) =>
    createReportSchedule(input)
  );

  if (!result.success) {
    redirectReportError(result.error.message, String(formData.get("reportSlug") ?? ""));
  }

  redirectReportSuccess("Schedule created.", String(formData.get("reportSlug") ?? ""));
}

export async function deleteReportScheduleAction(formData: FormData) {
  const result = await executeValidatedServerAction(reportScheduleRemovalSchema, Object.fromEntries(formData.entries()), (input) =>
    deleteReportSchedule(input.scheduleId)
  );

  if (!result.success) {
    redirectReportError(result.error.message, String(formData.get("reportSlug") ?? ""));
  }

  redirectReportSuccess("Schedule removed.", String(formData.get("reportSlug") ?? ""));
}

export async function runReportAction(formData: FormData) {
  const result = await executeValidatedServerAction(reportRunSchema, Object.fromEntries(formData.entries()), (input) => runReport(input));

  if (!result.success) {
    redirectReportError(result.error.message, String(formData.get("reportSlug") ?? ""));
  }

  redirectReportSuccess("Report run completed.", String(formData.get("reportSlug") ?? ""));
}
