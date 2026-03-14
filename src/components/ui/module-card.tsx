import Link from "next/link";

import type { AppModuleDefinition } from "@/types";

type ModuleCardProps = {
  module: AppModuleDefinition;
};

export function ModuleCard({ module }: ModuleCardProps) {
  return (
    <article className="resource-card">
      <div className="panel-header">
        <h2 className="resource-title">{module.label}</h2>
        <span className="module-card__status">
          {module.readiness}
        </span>
      </div>
      <p>{module.description}</p>
      <Link href={module.href} className="module-card__link">
        Open module
      </Link>
    </article>
  );
}
