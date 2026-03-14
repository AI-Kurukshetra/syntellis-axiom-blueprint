import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: string;
};

export function PageHeader({ title, description, action, eyebrow = "Workspace" }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__content">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="page-header__title">{title}</h1>
        <p className="page-header__description">{description}</p>
      </div>
      {action ? <div className="page-header__action">{action}</div> : null}
    </header>
  );
}
