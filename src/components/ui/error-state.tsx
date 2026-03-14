"use client";

type ErrorStateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  description = "The page could not finish loading. Try again or review the latest change that introduced the failure.",
  actionLabel = "Try again",
  onAction,
}: ErrorStateProps) {
  return (
    <section className="state-panel">
      <div className="state-panel__icon" aria-hidden>
        !!
      </div>
      <h2 className="state-panel__title">{title}</h2>
      <p className="state-panel__description">{description}</p>
      {onAction ? (
        <button type="button" onClick={onAction} className="button button-primary">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
