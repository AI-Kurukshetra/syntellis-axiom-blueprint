"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { benchmarkRemovalSchema, benchmarkSchema, benchmarkUpdateSchema, targetRemovalSchema, targetSchema, targetUpdateSchema } from "@/features/kpis/reference.schemas";
import { createBenchmark, createTarget, deleteBenchmark, deleteTarget, updateBenchmark, updateTarget } from "@/features/kpis/reference.service";
import { executeValidatedServerAction } from "@/lib/server-action";

const defaultRedirectPath = "/analytics/catalog";
const allowedRedirectPaths = new Set([defaultRedirectPath, "/benchmarks"]);

function getRedirectTarget(formData: FormData) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim();
  return allowedRedirectPaths.has(redirectTo) ? redirectTo : defaultRedirectPath;
}

function redirectReferenceError(message: string, redirectTo = defaultRedirectPath): never {
  redirect(`${redirectTo}?error=${encodeURIComponent(message)}`);
}

function redirectReferenceSuccess(message: string, redirectTo = defaultRedirectPath): never {
  revalidatePath(defaultRedirectPath);
  revalidatePath("/benchmarks");
  redirect(`${redirectTo}?message=${encodeURIComponent(message)}`);
}

export async function createBenchmarkAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData);
  const result = await executeValidatedServerAction(benchmarkSchema, Object.fromEntries(formData.entries()), (input) => createBenchmark(input));
  if (!result.success) redirectReferenceError(result.error.message, redirectTo);
  redirectReferenceSuccess(`Benchmark ${result.data.name} created.`, redirectTo);
}

export async function updateBenchmarkAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData);
  const result = await executeValidatedServerAction(benchmarkUpdateSchema, Object.fromEntries(formData.entries()), (input) => updateBenchmark(input.benchmarkId, input));
  if (!result.success) redirectReferenceError(result.error.message, redirectTo);
  redirectReferenceSuccess(`Benchmark ${result.data.name} updated.`, redirectTo);
}

export async function deleteBenchmarkAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData);
  const result = await executeValidatedServerAction(benchmarkRemovalSchema, Object.fromEntries(formData.entries()), async (input) => {
    const benchmark = await deleteBenchmark(input.benchmarkId);
    return { name: benchmark.name };
  });
  if (!result.success) redirectReferenceError(result.error.message, redirectTo);
  redirectReferenceSuccess(`Benchmark ${result.data.name} removed.`, redirectTo);
}

export async function createTargetAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData);
  const result = await executeValidatedServerAction(targetSchema, Object.fromEntries(formData.entries()), (input) => createTarget(input));
  if (!result.success) redirectReferenceError(result.error.message, redirectTo);
  redirectReferenceSuccess("Target created.", redirectTo);
}

export async function updateTargetAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData);
  const result = await executeValidatedServerAction(targetUpdateSchema, Object.fromEntries(formData.entries()), (input) => updateTarget(input.targetId, input));
  if (!result.success) redirectReferenceError(result.error.message, redirectTo);
  redirectReferenceSuccess("Target updated.", redirectTo);
}

export async function deleteTargetAction(formData: FormData) {
  const redirectTo = getRedirectTarget(formData);
  const result = await executeValidatedServerAction(targetRemovalSchema, Object.fromEntries(formData.entries()), async (input) => {
    const target = await deleteTarget(input.targetId);
    return { id: target.id };
  });
  if (!result.success) redirectReferenceError(result.error.message, redirectTo);
  redirectReferenceSuccess("Target removed.", redirectTo);
}
