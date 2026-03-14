type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({
  title = "Loading data",
  description = "Fetching the latest workspace context and module data.",
}: LoadingStateProps) {
  return (
    <section className="state-panel">
      <div
        className="state-panel__icon"
        style={{
          borderRadius: 999,
          border: "3px solid rgba(16, 32, 51, 0.12)",
          borderTopColor: "var(--accent)",
          animation: "spin 1s linear infinite",
        }}
      />
      <h2 className="state-panel__title">{title}</h2>
      <p className="state-panel__description">{description}</p>
    </section>
  );
}
