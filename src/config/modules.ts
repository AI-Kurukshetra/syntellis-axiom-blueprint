import type { AppModuleDefinition } from "@/types";

export const appModules: AppModuleDefinition[] = [
  {
    key: "dashboard",
    label: "Dashboards",
    description: "Role-based scorecards, KPI boards, and executive views.",
    href: "/dashboard",
    readiness: "scaffolded",
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Financial, clinical, operational, and revenue cycle analytics.",
    href: "/analytics",
    readiness: "implemented",
  },
  {
    key: "reports",
    label: "Reports",
    description: "Self-service reporting, exports, schedules, and templates.",
    href: "/reports",
    readiness: "implemented",
  },
  {
    key: "alerts",
    label: "Alerts",
    description: "Threshold alerts, escalations, and notification workflows.",
    href: "/alerts",
    readiness: "scaffolded",
  },
  {
    key: "compliance",
    label: "Compliance",
    description: "Audit logs, access reviews, and compliance reporting.",
    href: "/compliance",
    readiness: "scaffolded",
  },
  {
    key: "integrations",
    label: "Integrations",
    description: "Data source onboarding, mappings, and ingestion monitoring.",
    href: "/integrations",
    readiness: "scaffolded",
  },
  {
    key: "benchmarks",
    label: "Benchmarks",
    description: "Targets, benchmarking, and planning scenarios.",
    href: "/benchmarks",
    readiness: "implemented",
  },
  {
    key: "admin",
    label: "Administration",
    description: "Tenant setup, organization hierarchy, users, and jobs.",
    href: "/admin",
    readiness: "scaffolded",
  },
];
