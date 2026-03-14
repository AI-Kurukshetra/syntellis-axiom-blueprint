import type { ModuleKey } from "@/types";

export type NavigationItem = {
  label: string;
  href: string;
  description: string;
  moduleKey?: ModuleKey;
};

export const navigationItems: NavigationItem[] = [
  {
    label: "Home",
    href: "/",
    description: "Architecture overview",
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    description: "Scorecards and KPI boards",
    moduleKey: "dashboard",
  },
  {
    label: "Analytics",
    href: "/analytics",
    description: "Cross-domain analytics",
    moduleKey: "analytics",
  },
  {
    label: "Reports",
    href: "/reports",
    description: "Builder and schedules",
    moduleKey: "reports",
  },
  {
    label: "Alerts",
    href: "/alerts",
    description: "Notifications and thresholds",
    moduleKey: "alerts",
  },
  {
    label: "Compliance",
    href: "/compliance",
    description: "Audit and review",
    moduleKey: "compliance",
  },
  {
    label: "Integrations",
    href: "/integrations",
    description: "Sources and jobs",
    moduleKey: "integrations",
  },
  {
    label: "Benchmarks",
    href: "/benchmarks",
    description: "Targets and scenarios",
    moduleKey: "benchmarks",
  },
  {
    label: "Admin",
    href: "/admin",
    description: "Tenant and user controls",
    moduleKey: "admin",
  },
] as const;
