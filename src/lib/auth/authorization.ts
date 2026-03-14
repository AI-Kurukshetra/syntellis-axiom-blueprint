import { redirect } from "next/navigation";

import { appModules } from "@/config/modules";
import { navigationItems, type NavigationItem } from "@/config/navigation";
import type { CurrentUserContext, ModuleKey, PermissionCode } from "@/types";

import { requireCurrentUserContext } from "@/lib/auth/current-user";
import { ForbiddenError } from "@/lib/http-errors";

const modulePermissionMap: Record<ModuleKey, PermissionCode[]> = {
  dashboard: ["dashboard.view", "admin.manage"],
  analytics: ["analytics.view", "admin.manage"],
  reports: ["reports.manage", "admin.manage"],
  alerts: ["alerts.manage", "admin.manage"],
  compliance: ["compliance.view", "admin.manage"],
  integrations: ["integrations.manage", "admin.manage"],
  benchmarks: ["analytics.view", "admin.manage"],
  admin: ["admin.manage"],
};

const bootstrapNavigationItems: NavigationItem[] = [
  {
    label: "Onboarding",
    href: "/onboarding",
    description: "Create your first organization and assign the initial admin role.",
  },
];

export function hasPermission(context: CurrentUserContext, permissionCode: PermissionCode) {
  return context.permissionCodes.includes(permissionCode);
}

export function canAccessModule(context: CurrentUserContext, moduleKey: ModuleKey) {
  if (context.isBootstrapAdmin) {
    return false;
  }

  return modulePermissionMap[moduleKey].some((permissionCode) => hasPermission(context, permissionCode));
}

export function getAccessibleModuleKeys(context: CurrentUserContext) {
  return appModules.filter((module) => canAccessModule(context, module.key)).map((module) => module.key);
}

export function getAccessibleNavigationItems(context: CurrentUserContext) {
  if (context.isBootstrapAdmin) {
    return navigationItems.filter((item) => !item.moduleKey).concat(bootstrapNavigationItems);
  }

  return navigationItems.filter((item) => !item.moduleKey || canAccessModule(context, item.moduleKey));
}

export function getDefaultWorkspaceHref(context: CurrentUserContext) {
  if (context.isBootstrapAdmin) {
    return "/onboarding";
  }

  const defaultModule = appModules.find((module) => canAccessModule(context, module.key));
  return defaultModule?.href ?? "/";
}

export async function requirePermission(permissionCode: PermissionCode, message?: string) {
  const context = await requireCurrentUserContext();

  if (!hasPermission(context, permissionCode)) {
    throw new ForbiddenError(message ?? `Missing required permission: ${permissionCode}.`);
  }

  return context;
}

export async function requireAdminAccess() {
  const context = await requireCurrentUserContext();

  if (!context.canManageAdministration) {
    throw new ForbiddenError("Administrative access is required to manage tenant settings and user access.");
  }

  return context;
}

export async function requireModuleAccess(moduleKey: ModuleKey) {
  const context = await requireCurrentUserContext();

  if (!canAccessModule(context, moduleKey)) {
    redirect(getDefaultWorkspaceHref(context));
  }

  return context;
}

export async function requireBootstrapOnboardingAccess() {
  const context = await requireCurrentUserContext();

  if (!context.isBootstrapAdmin || context.profile?.organization_id) {
    redirect(getDefaultWorkspaceHref(context));
  }

  return context;
}
