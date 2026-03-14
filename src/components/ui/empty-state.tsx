type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="state-panel">
      <div className="state-panel__icon" aria-hidden>
        --
      </div>
      <h2 className="state-panel__title">{title}</h2>
      <p className="state-panel__description">{description}</p>
    </section>
  );
}
