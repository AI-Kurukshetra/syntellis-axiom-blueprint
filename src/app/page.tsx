import Link from "next/link";

const heroPills = [
  "Role-aware navigation and tenant-scoped access control",
  "Executive scorecards across finance, quality, and operations",
  "Secure reporting, alerts, and hierarchy management in one workspace",
];

const operatingStats = [
  { label: "Facilities online", value: "18", note: "Multi-campus rollups" },
  { label: "KPIs monitored", value: "142", note: "Financial and clinical" },
  { label: "Scheduled reports", value: "36", note: "Email and portal delivery" },
  { label: "Alert rules", value: "24", note: "Escalation-aware workflows" },
];

const executiveSignals = [
  {
    label: "Margin variance",
    detail: "Finance is watching a two-campus cost drift before month end.",
    value: "+1.8%",
  },
  {
    label: "Throughput pressure",
    detail: "Emergency operations are trending above target in the main facility.",
    value: "11 min",
  },
  {
    label: "Compliance posture",
    detail: "Audit logging and access reviews remain current across active users.",
    value: "Healthy",
  },
];

const platformModules = [
  {
    label: "Decision dashboards",
    description: "Board-ready scorecards with facility, department, and service-line rollups.",
  },
  {
    label: "Operational monitoring",
    description: "Watch staffing, occupancy, throughput, and anomaly signals in one calm workspace.",
  },
  {
    label: "Reporting engine",
    description: "Schedule finance and regulatory reports without moving into another product surface.",
  },
  {
    label: "Access control",
    description: "Tenant, facility, and department scope stays explicit through role-based policies.",
  },
  {
    label: "Data onboarding",
    description: "Connect source systems, map fields, and track ingestion quality from the same console.",
  },
  {
    label: "Benchmarking and planning",
    description: "Compare targets, model scenarios, and stage forecasting once the KPI layer is stable.",
  },
];

const trustHighlights = [
  { title: "Compliance-first", copy: "Audit events, access review data, and operational decisions share one trail." },
  { title: "Built for hierarchy", copy: "Organization, facility, department, and service line all exist as first-class context." },
  { title: "Designed for operators", copy: "The product surface stays restrained so leadership can act without hunting through clutter." },
];

const roadmap = [
  { phase: "Phase 01", detail: "Tenant setup, user management, hierarchy controls, and dashboard workspace." },
  { phase: "Phase 02", detail: "Reports, scheduled exports, alert rules, and richer operational analytics." },
  { phase: "Phase 03", detail: "Benchmarking, planning scenarios, and predictive insight workflows." },
];

export default function HomePage() {
  return (
    <main className="content-shell">
      <div className="page-stack">
        <header className="panel site-nav">
          <Link href="/" className="site-nav__brand">
            <span className="site-nav__mark">AX</span>
            <span className="site-nav__copy">
              <strong className="site-nav__title">Syntellis Axiom</strong>
              <span className="site-nav__subtitle">Healthcare intelligence for finance, quality, and planning.</span>
            </span>
          </Link>

          <div className="site-nav__actions">
            <Link href="/sign-in" className="button button-secondary">
              Sign in
            </Link>
            <Link href="/sign-up" className="button button-primary">
              Request access
            </Link>
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <span className="hero-badge">Multi-tenant healthcare SaaS</span>
            <h1 className="hero-title">
              A calmer control plane for <span>finance, quality, and operations.</span>
            </h1>
            <p className="hero-description">
              Syntellis Axiom brings executive dashboards, reporting, alerts, tenant administration, and hierarchy-aware analytics
              into one deliberate workspace built for healthcare systems.
            </p>

            <div className="hero-actions">
              <Link href="/sign-up" className="button button-primary">
                Start onboarding
              </Link>
              <Link href="/sign-in" className="button button-secondary">
                Open workspace
              </Link>
            </div>

            <div className="pill-stack">
              {heroPills.map((item) => (
                <span key={item} className="pill">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-showcase">
            <article className="preview-card preview-card--lead">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Executive overview</span>
                  <h2 className="preview-card__title">One workspace across dashboards, reports, alerts, and identity controls.</h2>
                </div>
                <span className="pill primary">Live tenant context</span>
              </div>

              <div className="preview-grid">
                {operatingStats.map((stat) => (
                  <article key={stat.label} className="mini-panel">
                    <span className="mini-panel__label">{stat.label}</span>
                    <p className="mini-panel__value">{stat.value}</p>
                    <p>{stat.note}</p>
                  </article>
                ))}
              </div>
            </article>

            <article className="preview-card">
              <div className="panel-header">
                <div>
                  <span className="eyebrow">Signal review</span>
                  <h2 className="preview-card__title">Leadership sees action-oriented status, not raw tooling exhaust.</h2>
                </div>
              </div>

              <div className="signal-list">
                {executiveSignals.map((signal) => (
                  <div key={signal.label} className="signal-row">
                    <div className="signal-row__label">
                      <strong>{signal.label}</strong>
                      <span>{signal.detail}</span>
                    </div>
                    <span className="signal-row__value">{signal.value}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="section-content">
            <div className="section-header">
              <div>
                <span className="eyebrow">Platform modules</span>
                <h2 className="section-title">The surface area is broad, but the interface stays disciplined.</h2>
              </div>
              <p className="section-copy">Each module shares the same access model, design language, and operational context.</p>
            </div>

            <div className="feature-grid">
              {platformModules.map((module) => (
                <article key={module.label} className="feature-card">
                  <h3>{module.label}</h3>
                  <p>{module.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="split-grid">
          <section className="section">
            <div className="section-content">
              <div className="section-header">
                <div>
                  <span className="eyebrow">Why it feels credible</span>
                  <h2 className="section-title">The product behaves like a real operating system, not a dashboard toy.</h2>
                </div>
              </div>

              <div className="stats-grid">
                {trustHighlights.map((item) => (
                  <article key={item.title} className="stat-card">
                    <span className="stat-label">{item.title}</span>
                    <p>{item.copy}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="section">
            <div className="section-content">
              <div className="section-header">
                <div>
                  <span className="eyebrow">Delivery sequence</span>
                  <h2 className="section-title">The roadmap stays grounded in operational value.</h2>
                </div>
              </div>

              <div className="roadmap">
                {roadmap.map((item) => (
                  <article key={item.phase} className="roadmap-card">
                    <h4>{item.phase}</h4>
                    <p>{item.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Ready to configure</span>
              <h2 className="panel-title">Use the existing auth and admin flows to shape the first tenant.</h2>
            </div>
            <div className="hero-actions">
              <Link href="/sign-up" className="button button-primary">
                Create account
              </Link>
              <Link href="/sign-in" className="button button-secondary">
                Sign in to workspace
              </Link>
            </div>
          </div>
          <p className="panel-copy">
            The UI now reflects a cleaner SaaS direction, with a structured shell, lighter surfaces, and a more deliberate information
            hierarchy across onboarding and administration.
          </p>
        </section>
      </div>
    </main>
  );
}
